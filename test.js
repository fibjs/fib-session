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
let delay = 125;
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
                        '^/set$': (r) => {
                            try {
                                r.session.sessionid = r.sessionid;
                            } catch (e) {
                                r.response.write(e.message);
                            }
                        },
                    },
                    r => {
                        request_session = r.session;
                        request_sessionid = r.session.sessionid;
                    }
                ]);
                srv.asyncRun();
            });

            it("expire check",() => {
                let httpClient = new http.Client();
                let res = httpClient.get(url.host + '/unKnownUrl');
                let expires = httpClient.cookies[0].expires;    

                if(opts.expires){
                    assert.notEqual(new Date(expires).toString(), "Invalid Date")
                }else{
                    assert.equal(new Date(expires).toString(), "Invalid Date");
                }
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
                assert.equal(res.cookies.length, 0);

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
                assert.deepEqual(session.get(request_sessionid), {});
                let cookie = res.cookies[0];
                assert.equal(cookie.value.length, 32);
                assert.equal(request_session.username, null);

                assert.deepEqual(get_persistent_storage(request_sessionid), null);
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), null);
            });

            it('set sessionID', () => {
                let client = new http.Client();

                // saves sessionID in client cookies
                let res = client.get(url.host + '/user?username=lion');

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion');

                res = client.get(url.host + '/set');

                var txt = res.data.toString();
                assert.equal(txt, "Can't set sessionid.");
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
                assert.equal(res.cookies.length, 0);

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

                assert.equal(res.cookies.length, 1);
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
                assert.equal(res_a.cookies.length, 0);

                res_b = client_b.get(url.host + '/user?username=lion-b');

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-b');
                assert.equal(res_b.data, undefined);
                assert.equal(res_b.cookies.length, 0);

                res_a = client_a.get(url.host + '/get');

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-a');
                assert.equal(res_a.data.toString(), 'lion-a');
                assert.equal(res_a.cookies.length, 0);

                assert.deepEqual(session.get(cookie_a.value), {
                    username: 'lion-a'
                });
                assert.deepEqual(get_persistent_storage(cookie_a.value), null);

                res_b = client_b.get(url.host + '/get');

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-b');
                assert.equal(res_b.data.toString(), 'lion-b');
                assert.equal(res_b.cookies.length, 0);

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

                assert.deepEqual(session.get(local_sid), {});

                let get_res = client.get(url.host + '/get');
                assert.equal(get_res.data, null);

                assert.equal(request_session.username, undefined);
                assert.equal(request_sessionid.length, 32);
                assert.deepEqual(session.get(local_sid), {});
                let cookie = get_res.cookies[0];
                assert.equal(cookie.value.length, 32);
                assert.equal(request_session.username, null);

                assert.deepEqual(session.get(local_sid), {});
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

                // assert.equal(JSON.parse(res.data.toString()).statusCode, 406);
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
                assert.equal(res.cookies.length, 0);

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
                    headers: {
                        sessionID: save_id
                    }
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
                    headers: {
                        sessionID: save_id
                    }
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
                    headers: {
                        sessionID: save_id
                    }
                });
                assert.equal(request_sessionid.length, 32);
                assert.equal(request_sessionid, save_id);
            });

            it('request with sessionID', () => {
                let client = new http.Client();
                let sid = get_value(client.get(url.host + '/session'));
                let res = client.get(url.host + '/user?username=lion', {
                    headers: {
                        sessionID: sid
                    }
                });

                assert.equal(sid.length, 32);
                assert.equal(request_sessionid, sid);
                assert.equal(request_session.username, 'lion');

                res = client.get(url.host + '/get', {
                    headers: {
                        sessionID: sid
                    }
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
                    headers: {
                        sessionID: sid
                    }
                });

                // assert.equal(request_sessionid, undefined);
                // assert.equal(request_session, undefined);

                res = client.get(url.host + '/get');

                assert.notEqual(request_sessionid, sid);
                assert.deepEqual(request_session, {});
                assert.deepEqual(session.get(request_sessionid), {});
                assert.deepEqual(get_persistent_storage(sid), null);
                wait();
                assert.deepEqual(get_persistent_storage(sid), null);
            });

            it('delete session property', () => {
                let client = new http.Client();
                let sid = get_value(client.get(url.host + '/session'));
                client.get(url.host + '/user?username=lion', {
                    headers: {
                        sessionID: sid
                    }
                });

                assert.equal(request_sessionid, sid);
                assert.deepEqual(request_session, {
                    username: 'lion'
                });
                assert.deepEqual(session.get(request_sessionid), {
                    username: 'lion'
                });

                let res = client.get(url.host + '/del', {
                    headers: {
                        sessionID: sid
                    }
                });

                assert.deepEqual(request_session, {});
                wait();
                assert.deepEqual(get_persistent_storage(sid), {});

                res = client.get(url.host + '/get', {
                    headers: {
                        sessionID: sid
                    }
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
                    headers: {
                        sessionID: sid
                    }
                });
                assert.equal(request_session.username, 'lion1');

                res = client.get(url.host + '/user?username=lion2', {
                    headers: {
                        sessionID: sid
                    }
                });
                assert.equal(request_session.username, 'lion2');

                res = client.get(url.host + '/user?username=lion3', {
                    headers: {
                        sessionID: sid
                    }
                });
                assert.equal(request_session.username, 'lion3');

                res = client.get(url.host + '/user?username=lion4', {
                    headers: {
                        sessionID: sid
                    }
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
                    headers: {
                        sessionID: sid_a
                    }
                });

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion');
                assert.equal(res_a.data, undefined);
                assert.equal(sid_a, request_sessionid);

                let res_b = client_b.get(url.host + '/user?username=lion', {
                    headers: {
                        sessionID: sid_b
                    }
                });

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion');
                assert.equal(res_b.data, undefined);
                assert.equal(sid_b, request_sessionid);

                res_a = client_a.get(url.host + '/user?username=lion-a', {
                    headers: {
                        sessionID: sid_a
                    }
                });

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-a');
                assert.equal(res_a.data, undefined);

                res_b = client_b.get(url.host + '/user?username=lion-b', {
                    headers: {
                        sessionID: sid_b
                    }
                });

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-b');
                assert.equal(res_b.data, undefined);

                res_a = client_a.get(url.host + '/get', {
                    headers: {
                        sessionID: sid_a
                    }
                });

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-a');
                assert.deepEqual(JSON.parse(res_a.data.toString()), {
                    username: 'lion-a'
                });
                assert.deepEqual(session.get(res_a.firstHeader('sessionID')), {});

                res_b = client_b.get(url.host + '/get', {
                    headers: {
                        sessionID: sid_b
                    }
                });

                assert.equal(request_sessionid.length, 32);
                assert.equal(request_session.username, 'lion-b');
                assert.deepEqual(JSON.parse(res_b.data.toString()), {
                    username: 'lion-b'
                });
                assert.deepEqual(session.get(res_b.firstHeader('sessionID')), {});

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
                        headers: {
                            sessionID: sid
                        }
                    });
                }, 0);

                wait(delay * 3);
                let res_b = client.get(url.host + '/kv?k=password&v=9465', {
                    headers: {
                        sessionID: sid
                    }
                });

                wait(delay * 2);

                assert.deepEqual(request_session, {
                    password: '9465'
                });

                setTimeout(() => {
                    res_a = client.get(url.host + '/kv?k=username&v=lion', {
                        headers: {
                            sessionID: sid
                        }
                    });
                }, 0);

                wait(delay * 5);
                res_b = client.get(url.host + '/kv?k=password&v=9465', {
                    headers: {
                        sessionID: sid
                    }
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
                        headers: {
                            sessionID: sid
                        }
                    });
                }, 0);

                wait(delay * 3);
                let res_b = client.get(url.host + '/kv?k=password&v=9465', {
                    headers: {
                        sessionID: sid
                    }
                });

                wait(delay * 2);

                assert.deepEqual(request_session, {
                    password: '9465'
                });

                setTimeout(() => {
                    res_a = client.get(url.host + '/kv?k=username&v=lion', {
                        headers: {
                            sessionID: sid
                        }
                    });
                }, 0);

                wait(delay * 2);
                res_b = client.get(url.host + '/kv?k=password&v=9465', {
                    headers: {
                        sessionID: sid
                    }
                });

                assert.deepEqual(request_session, {
                    username: 'lion',
                    password: '9465'
                });

                wait(delay * 4)
            });

        });

        describe('JSON Web Token', function () {
            let jwt_req_session = null;
            let session_jwt_key = '98DE76B1'; //HS256是对称签名，所以加密和验证的key一样
            before(() => {
                session = new Session(conn, {
                    session_jwt_algo: 'HS256',
                    session_jwt_key: session_jwt_key
                });
                session.setup();
            });
            it('check token', () => {
                ++url.port;
                let srv = new http.Server(url.port, [
                    session.cookie_filter,
                    (r) => {
                        if (r.address != '/login' && (!r.session || !r.session.id > 0)) {
                            // redirect
                            // r.response.redirect('/login');
                            r.response.write('redirect'); //for test
                            r.end();
                        }
                    },
                    {
                        '^/jwt$': (r) => {
                            jwt_req_session = r.session;
                            r.response.write('jwt')
                        },
                        '^/login$': (r) => {
                            session.setTokenCookie(r, {
                                id: 12345,
                                name: "Frank"
                            }, session_jwt_key);
                            jwt_req_session = r.session;
                            r.response.write('login')
                        },
                        '^/jwt_update$': (r) => {
                            try {
                                r.session.color = 'red';
                            } catch (e) {
                                r.response.write(e.message);
                            }
                        },
                        '^/jwt_delete$': (r) => {
                            try {
                                delete r.session.color;
                            } catch (e) {
                                r.response.write(e.message);
                            }
                        }
                    }
                ]);
                srv.asyncRun();
                let client = new http.Client();
                //not login
                res = client.get(url.host + '/jwt');
                var txt = res.data.toString();
                assert.equal(txt, 'redirect');
                //login
                res = client.get(url.host + '/login');
                var txt = res.data.toString();
                assert.equal(txt, 'login');
                var b = true;
                for (var i = 0; res.cookies && i < res.cookies.length; i++) {
                    if (res.cookies[i] && res.cookies[i].name == 'sessionID') {
                        assert.equal(res.cookies[i].value, 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MTIzNDUsIm5hbWUiOiJGcmFuayJ9.adE0u7POp1NG1GHQjZUGb9lfovw9-GdEVusqh2Sc0-M');
                        b = false;
                    }
                }
                assert.equal(b, false, 'JSON Web Token is not correct');
                assert.equal(jwt_req_session.id, 12345);
                assert.equal(jwt_req_session.name, "Frank");
                //after login
                res = client.get(url.host + '/jwt');
                var txt = res.data.toString();
                assert.equal(txt, 'jwt');
                assert.equal(jwt_req_session.id, 12345);
                assert.equal(jwt_req_session.name, "Frank");
                // jwt update throw exception
                res = client.get(url.host + '/jwt_update');
                var txt = res.data.toString();
                assert.equal(txt, "Can't modify the JSON Web Token.");
                // jwt delete throw exception
                res = client.get(url.host + '/jwt_delete');
                var txt = res.data.toString();
                assert.equal(txt, "Can't modify the JSON Web Token.");
                var jwt_token = session.getToken({
                    abc: 'xyz'
                }, 'test');
                assert.equal(jwt_token, 'eyJhbGciOiJIUzI1NiJ9.eyJhYmMiOiJ4eXoifQ.ltcUVSz3Np3ZSLpk7TwtTFFjlNY8X2nikCGcuF2ZMgE')
            });
        });
        describe('api in JWT', function () {
            var session_jwt_key = '98DE76B1-9';
            var jwt_sign = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MTIzNDUsIm5hbWUiOiJGcmFuayJ9.adE0u7POp1NG1GHQjZUGb9lfovw9-GdEVusqh2Sc0-M';
            var jwt_session_data = {
                "id": 12345,
                "name": "Frank"
            };
            before(() => {
                session = new Session(conn, {
                    session_jwt_algo: 'HS256',
                    session_jwt_key: session_jwt_key
                }); - 9
                session.setup();
            });

            function get_value(res, key = 'sessionID') {
                return JSON.parse(res.data.toString())[key];
            }
            it('server', () => {
                ++url.port;
                let srv = new http.Server(url.port, [
                    (r) => {
                        try {
                            session.api_filter(r);
                        } catch (e) {
                            r.response.statusCode = 500;
                            r.response.write(e.message);
                            r.end();
                        }
                    },
                    {
                        '^/session$': (r) => {
                            r.response.write('session-ok');
                        },
                        '^/user$': (r) => {
                            session.setTokenCookie && session.setTokenCookie(r, {
                                id: r.query.id || "1",
                                username: r.query.username
                            }, session_jwt_key);
                        },
                        '^/get$': (r) => r.response.write(JSON.stringify({
                            username: r.session.username
                        })),
                        '^/del$': (r) => {
                            try {
                                delete r.session.username
                            } catch (e) {
                                r.response.statusCode = 500;
                                r.response.write(e.message);
                                r.end();
                            }
                        }
                    },
                    r => {
                        request_session = r.session;
                        request_sessionid = r.sessionid;
                    }
                ]);
                srv.asyncRun();
            });
            it('get sessionID without the given path', () => {
                let res = new http.Client().get(url.host + '/user?id=300&username=lion');
                //user login
                assert.deepEqual(request_session, {
                    "id": "300",
                    "username": "lion"
                });
            });
            var save_id;
            it('request with two user sessionID', () => {
                //user "hoo" login 
                let res = new http.Client().get(url.host + '/user?id=50&username=hoo');
                save_id = res.cookies[0].value;
                //console.error('save_id:', res.cookies[0].value);
                assert.equal(save_id, 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjUwIiwidXNlcm5hbWUiOiJob28ifQ.ubTia0QE_D-aT8ziMShJEwgnbujatqTJC7amOhxabzw');
                assert.deepEqual(request_session, {
                    "id": "50",
                    "username": "hoo"
                });
                //other user "lion" login
                res = new http.Client().get(url.host + '/user?id=8&username=lion', {
                    headers: {
                        sessionID: save_id
                    }
                });
                //console.error('save_id2:', res.cookies[0].value);
                assert.equal(request_sessionid, 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjgiLCJ1c2VybmFtZSI6Imxpb24ifQ.bN9IiVDgy2qfQgndBv5SfyLSEotTw1RjK3hgjR-VJpM');
                assert.deepEqual(request_session, {
                    "id": "8",
                    "username": "lion"
                });
                //jwt does not need to save to store
                assert.deepEqual(session.get(request_sessionid), {});
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), null);
            });
            it('sessionID', () => {
                let res = new http.Client().get(url.host + '/get', {
                    headers: {
                        sessionID: save_id
                    }
                });
                var name = get_value(res, 'username');
                assert.equal(name, "hoo");
            });
            it('illegal sessionID, response 500', () => {
                let res = new http.Client().get(url.host + '/get', {
                    headers: {
                        sessionID: 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6Ij.bN9IiVDgy2qfQgndBv5SfyLSEotTw1RjK3hgjR-VJpM'
                    }
                });
                assert.equal(res.statusCode, 500);
                assert.equal(res.data.toString(), 'JSON Web Token is error.');
            });
            it('request with sessionID', () => {
                let client = new http.Client();
                let res = client.get(url.host + '/user?id=8&username=lion');
                save_id = res.cookies[0].value;
                assert.equal(save_id, 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjgiLCJ1c2VybmFtZSI6Imxpb24ifQ.bN9IiVDgy2qfQgndBv5SfyLSEotTw1RjK3hgjR-VJpM');
                assert.equal(request_sessionid, save_id);
                assert.equal(request_session.username, 'lion');
                res = client.get(url.host + '/get', {
                    headers: {
                        sessionID: save_id
                    }
                });
                assert.equal(request_sessionid, 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjgiLCJ1c2VybmFtZSI6Imxpb24ifQ.bN9IiVDgy2qfQgndBv5SfyLSEotTw1RjK3hgjR-VJpM');
                assert.equal(request_session.username, 'lion');
                assert.equal(JSON.parse(res.data.toString()).username, 'lion');
                assert.deepEqual(session.get(request_sessionid), {});
                assert.deepEqual(get_persistent_storage(request_sessionid), null);
                wait();
                assert.deepEqual(get_persistent_storage(request_sessionid), null);
            });
            it('delete session property, response 500', () => {
                let client = new http.Client();
                client.get(url.host + '/user?id=8&username=lion', {
                    headers: {
                        sessionID: save_id
                    }
                });
                assert.equal(request_sessionid, save_id);
                assert.deepEqual(request_session, {
                    id: "8",
                    username: 'lion'
                });
                assert.deepEqual(session.get(request_sessionid), {});
                let res = client.get(url.host + '/del', {
                    headers: {
                        sessionID: save_id
                    }
                });
                assert.equal(res.statusCode, 500);
                assert.equal(res.data.toString(), "Can't modify the JSON Web Token.");
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
                var sid = res.cookies[0].value;
                assert.deepEqual(session.get(request_sessionid), {});
                assert.deepEqual(get_persistent_storage(sid), null);
                wait();
                assert.deepEqual(get_persistent_storage(sid), null);
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
                        headers: {
                            sessionID: sid
                        }
                    });
                }, 0);
                wait(delay * 3);
                let res_b = client.get(url.host + '/kv?k=password&v=9465', {
                    headers: {
                        sessionID: sid
                    }
                });
                wait(delay * 2);
                assert.deepEqual(request_session, {
                    password: '9465'
                });
                setTimeout(() => {
                    res_a = client.get(url.host + '/kv?k=username&v=lion', {
                        headers: {
                            sessionID: sid
                        }
                    });
                }, 0);
                wait(delay * 2);
                res_b = client.get(url.host + '/kv?k=password&v=9465', {
                    headers: {
                        sessionID: sid
                    }
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
        expires: 7 * 24 * 60 * 60 * 1000
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