let kv = require('fib-kv');
let uuid = require('uuid');

let utils = require('./utils');
let get_store = require('./store');
let proxy = require('./proxy');

let jws = require('fib-jws');
let jwt = require('./jwt');

function session(conn, opts = {}) {
    let expires = opts.expires || new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
    let kv_db = new kv(conn, opts);
    let store = get_store(kv_db, opts);

    // for test
    this.store = store;

    this.setup = () => kv_db.setup();

    this.get = sid => store.get(sid);

    this.remove = sid => store.remove(sid);

    //JWT(JSON Web Token)
    let jwt_algo = utils.jwt_algo(opts);
    let jwt_key = utils.jwt_key(opts);
    if (jwt_algo && jwt_key) {
        this.getToken = jwt.getToken(jwt_algo);
        this.setTokenCookie = jwt.setTokenCookie(jwt_algo, utils.sid(opts));
    }

    this.cookie_filter = (r) => {
        var sessionid = r.cookies[utils.sid(opts)];
        r.sessionid = sessionid;

        if (jwt_algo && jwt_key) { //JWT
            jwt.filter(r, jwt_algo, jwt_key, utils.sid(opts), proxy);
        } else {
            let obj = {};
            if (!sessionid || !(obj = store.get(sessionid))) {
                r.sessionid = sessionid = uuid.random().hex();
                r.response.addCookie({
                    name: utils.sid(opts),
                    value: sessionid,
                    expires: expires
                    //domain:
                });
            }

            r.session = proxy(store, obj, sessionid);
        }
    };

    this.api_filter = (r) => {
        var sessionid = r.firstHeader(utils.sid(opts));
        r.sessionid = sessionid || undefined;

        if (jwt_algo && jwt_key) {
            jwt.filter(r, jwt_algo, jwt_key, utils.sid(opts), proxy);
        } else {
            let obj;
            if (!sessionid || !(obj = store.get(sessionid))) {
                r.sessionid = sessionid = uuid.random().hex();
                r.session = proxy(store, obj, sessionid, true);
            } else
                r.session = proxy(store, obj, sessionid);
        }
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