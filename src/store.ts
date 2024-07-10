import util = require('util');
import * as utils from './utils';
const fc = require('fib-cache');

export = (kv_db: FibKV.FibKVInstance, opts: FibSessionNS.StoreOptions = {}): FibSessionNS.Store => {
    const timers = {};
    const cache = new fc.LRU({
        max: utils.cache_size(opts),
        ttl: utils.cache_timeout(opts)
    });

    const fetch = (sid: FibSessionNS.IdNameType) => {
        var v = cache.get(sid);

        if(!v)
        {
            v = JSON.parse(kv_db.get(sid) || "{}");
            cache.set(sid, v);
        }
        return v;
    };

    const update = (sid: FibSessionNS.IdNameType, obj: FibSessionNS.Object) => {
        cache.set(sid, obj);
        if (timers[sid] !== undefined)
            return sid;

        timers[sid] = setTimeout(() => {
            kv_db.set(sid, JSON.stringify(obj));
            delete timers[sid];
        }, utils.cache_delay(opts));

        return sid;
    };

    const remove = (sid: FibSessionNS.IdNameType) => {
        if (!sid) return false;

        if (timers[sid] !== undefined) {
            timers[sid].clear();
            delete timers[sid];
        }

        cache.delete(sid);
        kv_db.remove(sid);
        return true;
    };

    return {
        get: fetch,
        set: update,
        remove: remove,
    };
}
