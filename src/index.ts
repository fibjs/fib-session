const FibKv = require('fib-kv');

import uuid = require('uuid');
import util = require("util");
import utils = require('./utils');
import get_store = require('./store');
import proxy = require('./proxy');

import jwt = require('./jwt');

const Session = function (conn: any, opts: FibSessionNS.Options = {}): void {
    const kv_db = new FibKv(conn, opts);
    let store: FibSessionNS.Store = get_store(kv_db, opts);

    // for test
    this.store = store;

    this.setup = () => kv_db.setup();

    this.get = (sid: FibSessionNS.IdNameType) => store.get(sid);

    this.remove = (sid: FibSessionNS.IdNameType) => store.remove(sid);

    // JWT(JSON Web Token)
    let jwt_algo = utils.jwt_algo(opts);
    let jwt_key = utils.jwt_key(opts);
    if (jwt_algo && jwt_key) {
        this.getToken = jwt.getToken(jwt_algo);
        this.setTokenCookie = jwt.setTokenCookie(jwt_algo, utils.sid(opts));
    }

    this.cookie_filter = (r: FibSessionNS.HttpRequest) => {
        let sessionid: FibSessionNS.IdValueType = r.cookies[utils.sid(opts)];
        r.sessionid = sessionid;

        if (jwt_algo && jwt_key) { //JWT
            jwt.filter(r, jwt_algo, jwt_key, utils.sid(opts), proxy);
        } else {
            let obj = {};
            if (!sessionid || util.isEmpty(obj = store.get(sessionid))) {
                r.sessionid = sessionid = uuid.random().hex();
                const cookies: FibSessionNS.CookieJsonPayload = {
                    name: utils.sid(opts),
                    value: sessionid
                };
                if (opts.expires) {
                    cookies.expires = new Date(Date.now() + opts.expires);
                }
                r.response.addCookie(cookies as Class_HttpCookie);
            }

            r.session = proxy(store, obj, sessionid);
        }
    };

    this.api_filter = (r: FibSessionNS.HttpRequest) => {
        let sessionid: FibSessionNS.IdValueType = r.firstHeader(utils.sid(opts));
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

    this.api_token = (r: FibSessionNS.HttpRequest) => {
        let obj = {};
        obj[utils.sid(opts)] = r.sessionid;

        r.response.setHeader('Content-Type', 'application/json');
        r.response.write(JSON.stringify(obj) as any);

        store.set(r.sessionid, r.session);
    }
}

export = Session;
