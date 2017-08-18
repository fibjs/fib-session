# fib-session
Session middleware for fibjs

## Install

```sh
npm install fib-session [--save]
```

## Test

```sh
npm run ci
```

## Creating a cookie-based session middleware

```js
var Session = require('fib-session')
var session = new Session(conn, opts);

var srv = new http.Server(8000, [
    session.cookie_filter, // use session ID via cookie
    {
        // routers
        '^/foo$': (r) => {
            var v = r.session.v;
        },
        ...
    }
]);
```

## Creating a api session middleware

```js
var Session = require('fib-session')
var session = new Session(conn, opts);

var srv = new http.Server(8000, [
    session.api_filter, // use api session filter
    {
        // routers
        '^/foo$': (r) => {
            var v = r.session.v;
        },
        '^/get-token$': session.api_token
    }
]);
```

*Both kv options and sesion options are in the same object.*

kv-store options

| options              | default | object/Map | LruCache | LevelDB | Redis | MongoDB | SQLite/MySQL |
|----------------------|---------|------------|----------|---------|-------|---------|--------------|
| table_name           |   "kvs" | x          | x        | x       | √     | √       | √            |
| key_name             |     "k" | x          | x        | x       | x     | √       | √            |
| value_name           |     "v" | x          | x        | x       | x     | √       | √            |
| key_size             |      32 | x          | x        | x       | x     | x       | √            |
| value_size           |     256 | x          | x        | x       | x     | x       | √            |
| cleanup_interval(ms) |   60000 | x          | x        | x       | x     | x       | √            |
| timeout(ms)          |       0 | x          | √        | x       | √     | √       | √            |
| prefix               |      "" | √          | √        | √       | √     | √       | √            |
| cache                |   false | √          | √        | √       | √     | √       | √            |
| cache_size           |   65536 | √          | √        | √       | √     | √       | √            |
| cache_timeout(ms)    |   60000 | √          | √        | √       | √     | √       | √            |

session options

| options                   | default            |                                                                                                  |
|---------------------------|--------------------|--------------------------------------------------------------------------------------------------|
| session_cache_size        |              65536 | max number of session in cache                                                                   |
| session_cache_timeout(ms) |             900000 | clear session objects which is not operated for a period of time from buffer, default 15 minutes |
| session_cache_delay       |                100 | time delay for write session to persistent storage                                               |
| session_id_name           |        "sessionID" |                                                                                                  |

- session cache is used to keep session consistency among http requires.
- the timeout of session cache must be larger than its delay

- The client-side has only the session ID. The session is operated on the server-side.

## Methods

### session.setup()
setup the backend database.

### v = session.cookie_filter
returns a cookie-based session filter.

### session.api_filter
returns a header-based session filter.

### session.api_token
returns an api handler that gets a new session ID.
---
JSON Web Token(JWT) options
| options                   | default |                                                                                                  |
|---------------------------|---------|--------------------------------------------------------------------------------------------------|
| session_jwt_algo          |   null  | see jws.ALGORITHMS in https://github.com/fibjs/fib-jws                                           |
| session_jwt_key           |   null  | sign key. see https://www.npmjs.com/package/fib-jws#jwssignheader-payload-key                    |
- set session_jwt_algo and session_jwt_key to enable JWT
```javascript
// session_jwt_algo 是算法
// session_jwt_key 是验证签名用的key. HS256算法的verify_key和sign_key是一样的(对称算法)，但其他算法就不一定。
var session = new Session(conn, { session_jwt_algo: 'HS256',  session_jwt_key: verify_key })
```
## Methods
### session.setTokenCookie 
- 下发令牌(Token)
- key 用于签名的key
- JWT的目的是为了分布式，所以同一个session里只能设置一次setSessionToken
  对应的r.session (默认值r.session={} ) 只能设置一次，多次设置则抛出异常
  new Error('Can't modify the JSON Web Token')。
```javascript
// 将{ id: 12345, name: "Frank" }签名之后设置cookie
session.setTokenCookie({ id: 12345, name: "Frank" }, sign_key)
```
### session.getToken 
- API模式获取token
```javascript
session.getToken ({ id: 12345, name: "Frank" }, sign_key)
```
