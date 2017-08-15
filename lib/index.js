let kv = require('fib-kv');
let uuid = require('uuid');

let utils = require('./utils');
let get_store = require('./store');
let proxy = require('./proxy');

function session(conn, opts = {}) {
    let kv_db = new kv(conn, opts);
    let store = get_store(kv_db, opts);

    // for test
    this.store = store;

    this.setup = () => kv_db.setup();

    this.get = sid => store.get(sid);

    this.remove = sid => store.remove(sid);

    this.cookie_filter = (r) => {
        var sessionid = r.cookies[utils.sid(opts)];
        r.sessionid = sessionid;

        let obj = {};
        if (!sessionid || !(obj = store.get(sessionid))) {
            r.sessionid = sessionid = uuid.random().hex();
            r.response.addCookie({
                name: utils.sid(opts),
                value: sessionid,
                //expire:
                //domain:
            });
        }

        r.session = proxy(store, obj, sessionid);
    };

    this.api_filter = (r) => {
        var sessionid = r.firstHeader(utils.sid(opts));
        r.sessionid = sessionid || undefined;

        let obj;
        if (!sessionid || !(obj = store.get(sessionid))) {
            r.sessionid = sessionid = uuid.random().hex();
            r.session = proxy(store, obj, sessionid, true);
        } else
            r.session = proxy(store, obj, sessionid);
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