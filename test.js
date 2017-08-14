let test = require('test');
test.setup();

let Session = require('./');

let db = require('db');
let fs = require('fs');
let http = require('http');
let kv = require('fib-kv');
let pool = require('fib-pool');

let util = require('util');
let coroutine = require('coroutine');

// the assertions before `wait()` might fail if the leading operations take too long to finish
let delay = 105;
let wait = function (n = delay) {
    coroutine.sleep(n)
};
let url = {
    protocol: 'http',
    domain: '127.0.0.1',
    port: 8080,
    get ['host']() {
        return this.protocol + '://' + this.domain + ':' + this.port
    },
};
let conf = {
    user: 'username',
    password: 'password',
    database: 'test',
};

let conn;
let session;
let request_session;
let request_sessionid;

let kv_db;
let get_persistent_storage = (sid) => JSON.parse(kv_db.get(sid));

function session_test(name, opts, _before, _after) {
    describe(name, () => {

        before(() => {
            kv_db = new kv(_before(), opts);
        });
        after(_after);

        describe('cookie auto', function () {
            before(() => {
                session = new Session(conn, opts);
                session.setup();
            });

            it('server', () => {
                ++url.port;

                let srv = new http.Server(url.port, [
                    session.cookie_filter,
                    {
                        '^/user$': (r) => r.session && (r.session.username = r.query.username),
                        '^/get$': (r) => r.response.write(r.session.username),
                        '^/del$': (r) => delete r.session.username,
                        '^/remove$': (r) => session.remove(r.sessionid),
                    },
                    r => {
                        request_session = r.session;
                        request_sessionid = r.sessionid;
                    }
                ]);
                srv.asyncRun();
            });

            it('without sessionID', () => {
                let res = new http.Client().get(url.host + '/user?username=lion');

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion');

                let cookie = res.cookies[0];
                assert.equal(cookie.name, 'sessionID');
                assert.equal(cookie.value, request_sessionid);

                assert.deepEqual(session.get(request_sessionid), {
                    username: 'lion'
                });
                assert.deepEqual(get_persistent_storage(request_sessionid), null);
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), {
                    username: 'lion'
                });
            });

            it('with sessionID', () => {
                let client = new http.Client();

                // saves sessionID in client cookies
                let res = client.get(url.host + '/user?username=lion');

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion');

                let cookie = res.cookies[0];
                assert.equal(cookie.name, 'sessionID');
                assert.equal(cookie.value, request_sessionid);

                assert.deepEqual(session.get(request_sessionid), {
                    username: 'lion'
                });
                assert.deepEqual(get_persistent_storage(request_sessionid), null);
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), {
                    username: 'lion'
                });

                res = client.get(url.host + '/get');

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion');

                assert.equal(res.data.toString(), 'lion');
                cookie = res.cookies[0];
                assert.equal(cookie.name, 'sessionID');
                assert.equal(cookie.value, request_sessionid);

                assert.deepEqual(session.get(request_sessionid), {
                    username: 'lion'
                });
                assert.deepEqual(get_persistent_storage(request_sessionid), {
                    username: 'lion'
                });
            });

            it('invalid sessionID', () => {
                let client = new http.Client();
                let res = client.get(url.host + '/user?username=lion');

                // remove session-id from store to make it illegal
                session.store.remove(res.cookies[0].value);

                res = client.get(url.host + '/get');

                assert.equal(request_session.username, undefined);
                assert.equal(request_sessionid.length, 32);
                assert.equal(session.get(request_sessionid), null);
                let cookie = res.cookies[0];
                assert.equal(cookie.value.length, 32);
                assert.equal(request_session.username, null);

                assert.deepEqual(get_persistent_storage(request_sessionid), null);
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), null);
            });

            it('delete session property', () => {
                let client = new http.Client();
                let res = client.get(url.host + '/user?username=lion');

                assert.equal(request_session.username, 'lion');
                assert.equal(request_sessionid.length, 32);
                let cookie = res.cookies[0];
                assert.equal(cookie.value.length, 32);
                assert.equal(request_session.username, 'lion');

                assert.deepEqual(session.get(request_sessionid), {
                    username: 'lion'
                });
                assert.deepEqual(get_persistent_storage(request_sessionid), null);
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), {
                    username: 'lion'
                });

                res = client.get(url.host + '/del');

                assert.equal(request_session.username, undefined);
                assert.equal(request_sessionid.length, 32);
                cookie = res.cookies[0];
                assert.equal(cookie.value.length, 32);
                assert.equal(request_session.username, null);

                assert.deepEqual(session.get(request_sessionid), {});
                assert.deepEqual(get_persistent_storage(request_sessionid), {
                    username: 'lion'
                });
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), {});

                res = client.get(url.host + '/get');

                assert.equal(request_session.username, undefined);
                assert.equal(request_sessionid.length, 32);

                assert.deepEqual(session.get(request_sessionid), {});

                cookie = res.cookies[0];
                assert.equal(cookie.value.length, 32);
                assert.equal(request_session.username, null);

                assert.deepEqual(session.get(request_sessionid), {});
                wait();
                assert.deepEqual(session.get(request_sessionid), {});
            });

            it('adjacent requests', () => {
                let client = new http.Client();
                let res = client.get(url.host + '/user?username=lion1');
                assert.equal(request_session.username, 'lion1');

                res = client.get(url.host + '/user?username=lion2');
                assert.equal(request_session.username, 'lion2');

                res = client.get(url.host + '/user?username=lion3');
                assert.equal(request_session.username, 'lion3');

                res = client.get(url.host + '/user?username=lion4');
                assert.equal(request_session.username, 'lion4');

                assert.deepEqual(session.get(request_sessionid), {
                    username: 'lion4'
                });
                assert.deepEqual(get_persistent_storage(request_sessionid), null);
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), {
                    username: 'lion4'
                });
            });

            it('multiple clients', () => {
                let client_a = new http.Client();
                let client_b = new http.Client();

                let res_a = client_a.get(url.host + '/user?username=lion');

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion');
                assert.equal(res_a.data, undefined);
                let cookie_a = res_a.cookies[0];
                assert.equal(cookie_a.name, 'sessionID');
                assert.equal(cookie_a.value, request_sessionid);

                let res_b = client_b.get(url.host + '/user?username=lion');

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion');
                assert.equal(res_b.data, undefined);
                let cookie_b = res_b.cookies[0];
                assert.equal(cookie_b.name, 'sessionID');
                assert.equal(cookie_b.value, request_sessionid);

                res_a = client_a.get(url.host + '/user?username=lion-a');

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-a');
                assert.equal(res_a.data, undefined);
                cookie_a = res_a.cookies[0];
                assert.equal(cookie_a.name, 'sessionID');
                assert.equal(cookie_a.value, request_sessionid);

                res_b = client_b.get(url.host + '/user?username=lion-b');

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-b');
                assert.equal(res_b.data, undefined);
                cookie_b = res_b.cookies[0];
                assert.equal(cookie_b.name, 'sessionID');
                assert.equal(cookie_b.value, request_sessionid);

                res_a = client_a.get(url.host + '/get');

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-a');
                assert.equal(res_a.data.toString(), 'lion-a');
                cookie_a = res_a.cookies[0];
                assert.equal(cookie_a.name, 'sessionID');
                assert.equal(cookie_a.value, request_sessionid);

                assert.deepEqual(session.get(cookie_a.value), {
                    username: 'lion-a'
                });
                assert.deepEqual(get_persistent_storage(cookie_a.value), null);

                res_b = client_b.get(url.host + '/get');

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-b');
                assert.equal(res_b.data.toString(), 'lion-b');
                cookie_b = res_b.cookies[0];
                assert.equal(cookie_b.name, 'sessionID');
                assert.equal(cookie_b.value, request_sessionid);

                assert.deepEqual(session.get(cookie_b.value), {
                    username: 'lion-b'
                });
                assert.deepEqual(get_persistent_storage(cookie_a.value), null);

                wait();
                assert.deepEqual(get_persistent_storage(cookie_a.value), {
                    username: 'lion-a'
                });
                assert.deepEqual(get_persistent_storage(cookie_b.value), {
                    username: 'lion-b'
                });
            });

            it('remove session', () => {
                let client = new http.Client();
                let res = client.get(url.host + '/user?username=lion');
                assert.equal(request_session.username, 'lion');

                // local_sid is used to check session.store after request_sessionid is deleted
                let local_sid = request_sessionid;

                res = client.get(url.host + '/remove');
                // assert.equal(request_sessionid, undefined);
                // assert.equal(request_session, undefined);

                assert.deepEqual(session.get(local_sid), null);

                let get_res = client.get(url.host + '/get');
                assert.equal(get_res.data, null);

                assert.equal(request_session.username, undefined);
                assert.equal(request_sessionid.length, 32);
                assert.equal(session.get(local_sid), null);
                let cookie = get_res.cookies[0];
                assert.equal(cookie.value.length, 32);
                assert.equal(request_session.username, null);

                assert.deepEqual(session.get(local_sid), null);
                assert.deepEqual(get_persistent_storage(request_sessionid), null);
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), null);
            });
        });

        describe('cookie path', function () {
            before(() => {
                session = new Session(conn, opts);
                session.setup();
            });

            it('server', () => {
                ++url.port;
                let srv = new http.Server(url.port, [
                    session.cookie_filter,
                    {
                        '^/user$': (r) => r.session && (r.session.username = r.query.username),
                        '^/get$': (r) => r.response.write(r.session.username),
                        '^/del$': (r) => delete r.session.username,
                        '^/remove$': (r) => session.remove(),
                        '^/session$': (r) => r.response.write(r.sessionid),
                    },
                    r => {
                        request_session = r.session;
                        request_sessionid = r.sessionid;
                    }
                ]);
                srv.asyncRun();
            });

            it('without/with given path', () => {
                let client = new http.Client();

                // let res = client.get(url.host + '/user?username=lion');

                // assert.equal(JSON.parse(res.data.toString()).status, 406);
                // assert.equal(request_session, undefined);
                // assert.equal(res.cookies.length, 0);

                res = client.get(url.host + '/session');

                assert.equal(request_sessionid.length, 32);
                assert.equal(JSON.stringify(request_session), '{}');
                let cookie = res.cookies[0];
                assert.equal(cookie.name, 'sessionID');
                assert.equal(cookie.value, request_sessionid);

                res = client.get(url.host + '/user?username=lion');
                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion');

                res = client.get(url.host + '/get');

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion');
                assert.equal(res.data.toString(), 'lion');
                cookie = res.cookies[0];
                assert.equal(cookie.name, 'sessionID');
                assert.equal(cookie.value, request_sessionid);

                assert.deepEqual(session.get(request_sessionid), {
                    username: 'lion'
                });
                assert.deepEqual(get_persistent_storage(request_sessionid), null);
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), {
                    username: 'lion'
                });
            });

        });

        describe('api', function () {
            before(() => {
                session = new Session(conn, opts);
                session.setup();
            });

            function get_value(res, key = 'sessionID') {
                return JSON.parse(res.data.toString())[key];
            }

            it('server', () => {
                ++url.port;
                let srv = new http.Server(url.port, [
                    session.api_filter,
                    {
                        '^/session$': session.api_token,
                        '^/user$': (r) => r.session && (r.session.username = r.query.username),
                        '^/get$': (r) => r.response.write(JSON.stringify({
                            username: r.session.username
                        })),
                        '^/del$': (r) => delete r.session.username,
                        '^/remove$': (r) => session.remove(r.sessionid),
                        '^/kv$': (r) => {
                            coroutine.sleep(delay * 4);
                            r.session[r.query.k] = r.query.v;
                        },
                    },
                    r => {
                        request_session = r.session;
                        request_sessionid = r.sessionid;
                    }
                ]);
                srv.asyncRun();
            });

            it('get sessionID without the given path', () => {
                let res = new http.Client().get(url.host + '/user?username=lion');

                assert.deepEqual(request_session, {
                    "username": "lion"
                });
            });

            var save_id;

            it('get sessionID with the given path', () => {
                let res = new http.Client().get(url.host + '/session');

                save_id = get_value(res);
                assert.equal(save_id.length, 32);
                assert.equal(request_sessionid, save_id);
                assert.deepEqual(request_session, {});
            });

            it('request with invalid sessionID', () => {
                let res = new http.Client().get(url.host + '/user?username=hoo');

                assert.deepEqual(request_session, {
                    "username": "hoo"
                });

                new http.Client().get(url.host + '/user?username=lion', {
                    sessionID: save_id
                });

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_sessionid, save_id);
                assert.deepEqual(request_session, {
                    "username": "lion"
                });
                assert.deepEqual(session.get(request_sessionid), {
                    "username": "lion"
                });
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), {
                    "username": "lion"
                });
            });

            it('get sessionID with invalid sessionID', () => {
                let res = new http.Client().get(url.host + '/session');
                let sid = JSON.parse(res.data.toString()).sessionID;

                assert.equal(sid.length, 32);
                assert.equal(request_sessionid, sid);
                assert.deepEqual(request_session, {});

                assert.equal(sid, request_sessionid);

                assert.deepEqual(session.get(request_sessionid), {});
                assert.deepEqual(get_persistent_storage(request_sessionid), null);
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), {});

                res = new http.Client().get(url.host + '/session', {
                    sessionID: save_id
                });
                sid = JSON.parse(res.data.toString()).sessionID;

                assert.equal(sid.length, 32);
                assert.equal(request_sessionid, sid);
                assert.deepEqual(request_session, {
                    "username": "lion"
                });

                assert.equal(sid, request_sessionid);

                assert.deepEqual(session.get(request_sessionid), {
                    "username": "lion"
                });
                assert.deepEqual(get_persistent_storage(request_sessionid), {
                    "username": "lion"
                });
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), {
                    "username": "lion"
                });
            });

            it('illegal sessionID', () => {
                let res = new http.Client().get(url.host + '/session', {
                    sessionID: save_id
                });
                assert.equal(request_sessionid.length, 32);
                assert.equal(request_sessionid, save_id);
            });

            it('request with sessionID', () => {
                let client = new http.Client();
                let sid = get_value(client.get(url.host + '/session'));
                let res = client.get(url.host + '/user?username=lion', {
                    sessionID: sid
                });

                assert.equal(sid.length, 32);
                assert.equal(request_sessionid, sid);
                assert.equal(request_session.username, 'lion');

                res = client.get(url.host + '/get', {
                    sessionID: sid
                });

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion');
                assert.equal(JSON.parse(res.data.toString()).username, 'lion');

                assert.deepEqual(session.get(request_sessionid), {
                    username: 'lion'
                });
                assert.deepEqual(get_persistent_storage(request_sessionid), null);
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), {
                    username: 'lion'
                });
            });

            it('remove session', () => {
                let client = new http.Client();
                let sid = get_value(client.get(url.host + '/session'));

                assert.equal(request_sessionid.length, 32);
                assert.deepEqual(request_session, {});
                assert.deepEqual(session.get(request_sessionid), {});
                assert.equal(request_session.username, undefined);

                let res = client.get(url.host + '/remove', {
                    sessionID: sid
                });

                // assert.equal(request_sessionid, undefined);
                // assert.equal(request_session, undefined);

                res = client.get(url.host + '/get', {
                    sessionID: sid
                });

                assert.notEqual(request_sessionid, sid);
                assert.deepEqual(request_session, {});
                assert.deepEqual(session.get(request_sessionid), null);
                assert.deepEqual(get_persistent_storage(sid), null);
                wait();
                assert.deepEqual(get_persistent_storage(sid), null);
            });

            it('delete session property', () => {
                let client = new http.Client();
                let sid = get_value(client.get(url.host + '/session'));
                client.get(url.host + '/user?username=lion', {
                    sessionID: sid
                });

                assert.equal(request_sessionid, sid);
                assert.deepEqual(request_session, {
                    username: 'lion'
                });
                assert.deepEqual(session.get(request_sessionid), {
                    username: 'lion'
                });

                let res = client.get(url.host + '/del', {
                    sessionID: sid
                });

                assert.deepEqual(request_session, {});
                wait();
                assert.deepEqual(get_persistent_storage(sid), {});

                res = client.get(url.host + '/get', {
                    sessionID: sid
                });

                assert.equal(request_session.username, undefined);
                assert.deepEqual(session.get(request_sessionid), {});

                assert.deepEqual(session.get(request_sessionid), {});
                wait();
                assert.deepEqual(session.get(request_sessionid), {});
            });

            it('adjacent requests', () => {
                let client = new http.Client();
                let sid = get_value(client.get(url.host + '/session'));
                let res = client.get(url.host + '/user?username=lion1', {
                    sessionID: sid
                });
                assert.equal(request_session.username, 'lion1');

                res = client.get(url.host + '/user?username=lion2', {
                    sessionID: sid
                });
                assert.equal(request_session.username, 'lion2');

                res = client.get(url.host + '/user?username=lion3', {
                    sessionID: sid
                });
                assert.equal(request_session.username, 'lion3');

                res = client.get(url.host + '/user?username=lion4', {
                    sessionID: sid
                });
                assert.equal(request_session.username, 'lion4');

                assert.deepEqual(session.get(request_sessionid), {
                    username: 'lion4'
                });
                assert.deepEqual(get_persistent_storage(sid), null);
                wait();
                assert.deepEqual(get_persistent_storage(sid), {
                    username: 'lion4'
                });
            });

            it('multiple clients', () => {
                let client_a = new http.Client();
                let client_b = new http.Client();

                let sid_a = get_value(client_a.get(url.host + 'session'));
                let sid_b = get_value(client_b.get(url.host + 'session'));

                let res_a = client_a.get(url.host + '/user?username=lion', {
                    sessionID: sid_a
                });

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion');
                assert.equal(res_a.data, undefined);
                assert.equal(sid_a, request_sessionid);

                let res_b = client_b.get(url.host + '/user?username=lion', {
                    sessionID: sid_b
                });

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion');
                assert.equal(res_b.data, undefined);
                assert.equal(sid_b, request_sessionid);

                res_a = client_a.get(url.host + '/user?username=lion-a', {
                    sessionID: sid_a
                });

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-a');
                assert.equal(res_a.data, undefined);

                res_b = client_b.get(url.host + '/user?username=lion-b', {
                    sessionID: sid_b
                });

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-b');
                assert.equal(res_b.data, undefined);

                res_a = client_a.get(url.host + '/get', {
                    sessionID: sid_a
                });

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-a');
                assert.deepEqual(JSON.parse(res_a.data.toString()), {
                    username: 'lion-a'
                });
                assert.deepEqual(session.get(res_a.firstHeader('sessionID')), null);

                res_b = client_b.get(url.host + '/get', {
                    sessionID: sid_b
                });

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-b');
                assert.deepEqual(JSON.parse(res_b.data.toString()), {
                    username: 'lion-b'
                });
                assert.deepEqual(session.get(res_b.firstHeader('sessionID')), null);

                wait();
                assert.deepEqual(get_persistent_storage(sid_a), {
                    username: 'lion-a'
                });
                assert.deepEqual(get_persistent_storage(sid_b), {
                    username: 'lion-b'
                });
            });

            it('simultaneous set the same session', () => {
                let client = new http.Client();
                let sid = get_value(client.get(url.host + 'session'));

                let res_a;
                setTimeout(() => {
                    res_a = client.get(url.host + '/kv?k=username&v=lion', {
                        sessionID: sid
                    });
                }, 0);

                wait(delay * 3);
                let res_b = client.get(url.host + '/kv?k=password&v=9465', {
                    sessionID: sid
                });

                wait(delay * 2);

                assert.deepEqual(request_session, {
                    password: '9465'
                });

                setTimeout(() => {
                    res_a = client.get(url.host + '/kv?k=username&v=lion', {
                        sessionID: sid
                    });
                }, 0);

                wait(delay * 5);
                res_b = client.get(url.host + '/kv?k=password&v=9465', {
                    sessionID: sid
                });

                assert.deepEqual(request_session, {
                    username: 'lion',
                    password: '9465'
                });

                wait(delay * 4)
            });

            it('get() resets TTL', () => {
                return;
                // sid

                // req-a
                // req-b get //
                // req-a set @ expire+
                // req-b get // not updated

                // req-a
                // req-b get //
                // req-a get // renew object TTL
                // req-a set @ expire+
                // req-b get // not updated

                let client = new http.Client();
                let sid = get_value(client.get(url.host + 'session'));

                let res_a;
                setTimeout(() => {
                    res_a = client.get(url.host + '/kv?k=username&v=lion', {
                        sessionID: sid
                    });
                }, 0);

                wait(delay * 3);
                let res_b = client.get(url.host + '/kv?k=password&v=9465', {
                    sessionID: sid
                });

                wait(delay * 2);

                assert.deepEqual(request_session, {
                    password: '9465'
                });

                setTimeout(() => {
                    res_a = client.get(url.host + '/kv?k=username&v=lion', {
                        sessionID: sid
                    });
                }, 0);

                wait(delay * 2);
                res_b = client.get(url.host + '/kv?k=password&v=9465', {
                    sessionID: sid
                });

                assert.deepEqual(request_session, {
                    username: 'lion',
                    password: '9465'
                });

                wait(delay * 4)
            });

        });

    });

}

session_test(
    'SQLite', {
        table_name: 'session',
        domain: url.domain,
        session_cache_timeout: delay * 2,
    },
    () => conn = db.openSQLite('test.db'),
    () => {
        conn.close();
        try {
            fs.unlink('test.db')
        } catch (e) {}
    });

session_test(
    'SQLite pool', {
        table_name: 'session',
        domain: url.domain,
        session_cache_timeout: delay * 2,
    },
    () => conn = pool(() => db.openSQLite('test.db'), 10, 1 * 1000),
    () => {
        let time_limit = new Date().getTime() + 3000;
        while (conn.connections() && new Date().getTime() < time_limit)
            coroutine.sleep(10);
        try {
            fs.unlink('test.db')
        } catch (e) {}
    });

session_test(
    'MySQL', {
        table_name: 'session',
        domain: url.domain,
        session_cache_timeout: delay * 2,
    },
    () => conn = db.openMySQL(`mysql://${conf.user}:${conf.password}@localhost/${conf.database}`),
    () => {
        try {
            conn.execute('DROP TABLE session')
        } catch (e) {}
        conn.close();
    });

session_test(
    'MySQL pool', {
        table_name: 'session',
        domain: url.domain,
        session_cache_timeout: delay * 2,
    },
    () => conn = pool(() => db.openMySQL(`mysql://${conf.user}:${conf.password}@localhost/${conf.database}`), 10, 1 * 1000),
    () => {
        try {
            conn.execute('DROP TABLE session')
        } catch (e) {}
    });

test.run(console.DEBUG);