
v0.4.2 / 2019-12-11
==================

  * fix proxy traps error in strict mode.
  * add test fibjs target.

v0.4.1 / 2019-04-27
===================

  * Release v0.4.1
  * test case robust.
  * remove useless typo
  * typo robust.
  * enable mysql test in travis-ci; add appveyor ci
  * support use existed kv instance as constructor's input
  * upgrade dependencies.

v0.4.0 / 2018-11-23
===================

  * Release v0.4.0
  * normalize typo.
  * Release v0.3.2 (#13)

v0.3.2 / 2018-06-19
===================

  * Release v0.3.2
  * better programmable declaration files.
  * add ci and npm badget to README.md
  * Release v0.3.1 (#12)

v0.3.1 / 2018-06-19
===================

  * Release v0.3.1
  * more detailed types.
  * add 'types' field in 'package.json'
  * 0.3.0 (#11)

v0.3.0 / 2018-06-18
===================

  * 0.3.0
  * add macro `FIB_SESSION_TEST_MYSQL`
  * migrate source to typescript.
  * v0.2.1
  * fix:session expires Invalid (#10)

v0.2.0 / 2018-02-09
===================

  * v0.2.0
  *  fix testcase; fix if condition in cookie_filter; add getter for sessionid in proxy; setter throws error when setting the sessionid (#9)

v0.1.2 / 2017-12-28
===================

  * v0.1.2
  * support to set expires of cookie (#8)
  * Update store.js (#7)
  * compatable with new http api.
  * upgrade fib-kv
  * Merge pull request #5 from blingz/master
  * add parameter for setTokenCookie
  * update readme of JWT
  * update readme.me of JWT
  * Merge pull request #4 from blingz/master
  * support JSON Web Token
  * 重构代码
  * document.
  * only send cookie when new session created.
  * 修改错误，简化逻辑
  * Merge pull request #3 from viemacs/devel
  * [test] unittest of MySQL, and a longer delay before check the persistent storage
  * [test] conn-pool on SQLite
  * update deps versions.
  * Merge pull request #2 from viemacs/devel
  * [doc] fib-session basic operations and options
  * Merge pull request #1 from viemacs/wip
  * [WIP] add multiple DBMS unittest
  * fix unittest session_buffer_timeout => session_cache_timeout
  * fix write-delay problem introduced by merging buffer to cache
  * [WIP] remove buffer and implement set-delay in cache
  * [WIP] unittest for renew cache obj
  * unittest: 2 req simutaneously set session
  * updating unittest for new Session, the store is encapsulated
  * [WIP] writing buffer-cache-kv and apis
  * basic config
  * Initial commit
