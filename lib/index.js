const FibKv = require("fib-kv");
const uuid = require("uuid");
const util = require("util");
const utils = require("./utils");
const get_store = require("./store");
const proxy = require("./proxy");
const jwt = require("./jwt");
const Session = function (conn, opts = {}) {
    const kv_db = new FibKv(conn, opts);
    let store = get_store(kv_db, opts);
    // for test
    this.store = store;
    this.setup = () => kv_db.setup();
    this.get = (sid) => store.get(sid);
    this.remove = (sid) => store.remove(sid);
    // JWT(JSON Web Token)
    let jwt_algo = utils.jwt_algo(opts);
    let jwt_key = utils.jwt_key(opts);
    if (jwt_algo && jwt_key) {
        this.getToken = jwt.getToken(jwt_algo);
        this.setTokenCookie = jwt.setTokenCookie(jwt_algo, utils.sid(opts));
    }
    this.cookie_filter = (r) => {
        let sessionid = r.cookies[utils.sid(opts)];
        r.sessionid = sessionid;
        if (jwt_algo && jwt_key) { //JWT
            jwt.filter(r, jwt_algo, jwt_key, utils.sid(opts), proxy);
        }
        else {
            let obj = {};
            if (!sessionid || util.isEmpty(obj = store.get(sessionid))) {
                r.sessionid = sessionid = uuid.random().hex();
                const cookies = {
                    name: utils.sid(opts),
                    value: sessionid
                };
                if (opts.expires) {
                    cookies.expires = new Date(Date.now() + opts.expires);
                }
                r.response.addCookie(cookies);
            }
            r.session = proxy(store, obj, sessionid);
        }
    };
    this.api_filter = (r) => {
        let sessionid = r.firstHeader(utils.sid(opts));
        r.sessionid = sessionid || undefined;
        if (jwt_algo && jwt_key) {
            jwt.filter(r, jwt_algo, jwt_key, utils.sid(opts), proxy);
        }
        else {
            let obj;
            if (!sessionid || !(obj = store.get(sessionid))) {
                r.sessionid = sessionid = uuid.random().hex();
                r.session = proxy(store, obj, sessionid, true);
            }
            else
                r.session = proxy(store, obj, sessionid);
        }
    };
    this.api_token = (r) => {
        let obj = {};
        obj[utils.sid(opts)] = r.sessionid;
        r.response.setHeader('Content-Type', 'application/json');
        r.response.write(JSON.stringify(obj));
        store.set(r.sessionid, r.session);
    };
};
module.exports = Session;
