let kv = require('fib-kv');
let util = require('util');
let uuid = require('uuid');

let utils = require('./utils');

function send_error(res, code, msg) {
    res.status = 400;
    res.setHeader('Content-Type', 'application/json');
    res.write(JSON.stringify({
        error: 'Bad Request',
        status: code,
        message: msg,
    }));
    res.end();
}

function session(conn, opts = {}) {
    let store = (function() {
        let kv_db = new kv(conn, opts);
        kv_db.setup();
        let buffer = {};
        let timers = {};
        let cache = new util.LruCache(utils.buffer_size(opts), utils.buffer_timeout(opts));

        let fetch = sid => buffer[sid] || cache.get(sid, sid => JSON.parse(kv_db.get(sid)));

        let update = (sid, value) => {
            if (buffer[sid]) {
                buffer[sid] = value;
                return sid;
            }
            buffer[sid] = value;
            timers[sid] = setTimeout(() => {
                cache.set(sid, buffer[sid]);
                kv_db.set(sid, JSON.stringify(buffer[sid]));
                delete buffer[sid];
                delete timers[sid];
            }, utils.buffer_delay(opts));
            return sid;
        };

        let remove = (sid) => {
            if (!sid) return false;
            timers[sid] && timers[sid].clear();
            delete timers[sid];
            delete buffer[sid];
            delete cache[sid];
            kv_db.remove(sid);
            delete req.session;
            delete req.sessionid;
            return true;
        };

        return {
            get: fetch,
            set: update,
            remove: remove,
        };
    }());

    let req = {};

    let handler = {
        set: (target, key, value) => {
            target[key] = value;
            store.set(req.sessionid, req.session);
            return req.sessionid;
        },
        deleteProperty: (target, key) => {
            delete target[key];
            return store.set(req.sessionid, target);
        },
    };

    // for test
    this.store = store;

    this.get = (sid) => store.get(sid);

    this.remove = (sid) => store.remove(sid);

    this.cookie_filter = (r) => {
        req = r;
        r.sessionid = r.cookies[utils.sid(opts)];

        if ( !r.sessionid && opts.path && opts.path !== r.address)
            return send_error(r.response, 406, 'A valid ' + utils.sid(opts) +
                              ' is required in http request cookies.');

        let obj;
        if ( !r.sessionid || !(obj = store.get(r.sessionid)) ) {
            r.sessionid = uuid.random().hex();
            // store.set(r.sessionid, {});
        }

        r.session = new Proxy(obj || {}, handler);

        r.response.setHeader('Content-Type', 'application/json');
        r.response.addCookie({
            name: utils.sid(opts),
            value: r.sessionid,
            //expire:
            //domain:
        });
    };

    this.api_filter = (r) => {
        req = r;
        r.sessionid = r.firstHeader(utils.sid(opts)) || undefined;

        let obj;
        if ( !r.sessionid || !(obj = store.get(r.sessionid)) ) {
            if (r.address !== utils.path(opts))
                return send_error(r.response, 406, 'A valid ' + utils.sid(opts) +
                                  ' is required in http request header.');
            r.sessionid = uuid.random().hex();
        }

        r.session = new Proxy(obj || {}, handler);
        store.set(r.sessionid, r.session);

        // if (r.address === utils.path(opts)) {
        //     r.response.setHeader('Content-Type', 'application/json');
        //     r.response.write(JSON.stringify({
        //         //utils.sid(opts): r.sessionid,
        //     }));
        // }

    };
}

module.exports = session;
