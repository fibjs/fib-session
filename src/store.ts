import { FibSessionKVSource, FibSessionStoreOptions, FibSessionObject, FibSessionIdNameType, FibSessionStore } from "../@types";

import util = require('util');
import * as utils from './utils';

export = (kv_db: FibSessionKVSource, opts: FibSessionStoreOptions = {}): FibSessionStore => {
    const timers = {};
    const cache = new util.LruCache(utils.cache_size(opts), utils.cache_timeout(opts));

    const fetch = (sid: FibSessionIdNameType) => {
        const v = cache.get(sid, sid => JSON.parse(kv_db.get(sid) || "{}"));
        cache.set(sid, v);
        return v;
    };

    const update = (sid: FibSessionIdNameType, obj: FibSessionObject) => {
        cache.set(sid, obj);
        if (timers[sid] !== undefined)
            return sid;

        timers[sid] = setTimeout(() => {
            kv_db.set(sid, JSON.stringify(obj));
            delete timers[sid];
        }, utils.cache_delay(opts));

        return sid;
    };

    const remove = (sid: FibSessionIdNameType) => {
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
