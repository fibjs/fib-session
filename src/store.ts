import util = require('util');
import * as utils from './utils';

export = (kv_db: FibKV.FibKVInstance, opts: FibSessionNS.StoreOptions = {}): FibSessionNS.Store => {
    const timers = {};
    const cache = new util.LruCache(utils.cache_size(opts), utils.cache_timeout(opts));

    const fetch = (sid: FibSessionNS.IdNameType) => {
        const v = cache.get(sid, (sid: string) => JSON.parse(kv_db.get(sid) || "{}"));
        cache.set(sid, v);
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
