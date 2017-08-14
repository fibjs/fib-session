let kv = require('fib-kv');
let util = require('util');
let uuid = require('uuid');

let utils = require('./utils');

function session(conn, opts = {}) {
    let kv_db = new kv(conn, opts);

    let store = (function () {
        let timers = {};
        let cache = new util.LruCache(utils.cache_size(opts), utils.cache_timeout(opts));

        let fetch = sid => {
            let v = cache.get(sid, sid => JSON.parse(kv_db.get(sid)));
            cache.set(sid, v);
            return v;
        };

        let update = (sid, obj) => {
            cache.set(sid, obj);
            if (timers[sid] !== undefined)
                return sid;

            timers[sid] = setTimeout(() => {
                kv_db.set(sid, JSON.stringify(obj));
                delete timers[sid];
            }, utils.cache_delay(opts));

            return sid;
        };

        let remove = (sid) => {
            if (!sid) return false;

            if (timers[sid] !== undefined) {
                timers[sid].clear();
                delete timers[sid];
            }

            cache.remove(sid);
            kv_db.remove(sid);
            return true;
        };

        return {
            get: fetch,
            set: update,
            remove: remove,
        };
    }());

    function proxy(o, sessionid, tmp) {
        return new Proxy(o || {}, {
            set: (target, key, value) => {
                if (target[key] !== value) {
                    target[key] = value;
                    if (!tmp)
                        store.set(sessionid, target);
                }
                return value;
            },
            deleteProperty: (target, key) => {
                delete target[key];
                if (!tmp)
                    store.set(sessionid, target);
            },
        });
    }

    // for test
    this.store = store;

    this.setup = () => kv_db.setup();

    this.get = sid => store.get(sid);

    this.remove = sid => store.remove(sid);

    this.cookie_filter = (r) => {
        var sessionid = r.cookies[utils.sid(opts)];
        r.sessionid = sessionid;

        let obj = {};
        if (!sessionid || !(obj = store.get(sessionid)))
            r.sessionid = sessionid = uuid.random().hex();

        r.session = proxy(obj, sessionid);
        r.response.addCookie({
            name: utils.sid(opts),
            value: sessionid,
            //expire:
            //domain:
        });
    };

    this.api_filter = (r) => {
        var sessionid = r.firstHeader(utils.sid(opts));
        r.sessionid = sessionid || undefined;

        let obj;
        if (!sessionid || !(obj = store.get(sessionid))) {
            r.sessionid = sessionid = uuid.random().hex();
            r.session = proxy(obj, sessionid, true);
        } else
            r.session = proxy(obj, sessionid);
    };

    this.api_token = (r) => {
        let obj = {};
        obj[utils.sid(opts)] = r.sessionid;

        r.response.setHeader('Content-Type', 'application/json');
        r.response.write(JSON.stringify(obj));

        store.set(r.sessionid, r.session);
    }
}

module.exports = session;