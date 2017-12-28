let util = require('util');
let utils = require('./utils');

module.exports = (kv_db, opts) => {
    let timers = {};
    let cache = new util.LruCache(utils.cache_size(opts), utils.cache_timeout(opts));

    let fetch = sid => {
        let v = cache.get(sid, sid => JSON.parse(kv_db.get(sid) || "{}"));
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
}
