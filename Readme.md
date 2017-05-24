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

## Creating a session middleware

```js
var Session = require('fib-session')
var session = new Session(conn, opts);

var srv = new http.Server(8000, [
    session.cookie_filter, // use session ID via cookie
    session.api_filter, // use session ID via api
    {
        // routers
        '^/foo$': (r) => {},
        ...
    }
]);
```

<!--
- domain: only allocate sessionid while visiting the given domain
-->
- cookie-key: sessionID (default)
- path: only allocate sessionid while visiting the given path
- api mode:
    - a session ID can be get via a request on the given path
    - a valid session ID is required in http request header
- key `__sid__` is reserved in session
- if session module cannot generate a valid session ID,
  the session ID will be set to `false`
  
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
| session_id_path           |   '/session' (api) | request path to allocate session id, api_filter must have an id_path                             |
|                           | undefined (cookie) | cookie_filter will allocate session id automatically if id_path is not set                       |

- session cache is used to keep session consistency among http requires.
- the timeout of session cache must be larger than its delay

- The client-side has only the session ID. The session is operated on the server-side.
