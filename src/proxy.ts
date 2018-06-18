import { FibSessionObjectProxyGenerator, FibSessionStore, FibSessionProxyTmp, FibSessionObjectProxy } from '../@types';

import util = require('util');

const proxy: FibSessionObjectProxyGenerator = (store: FibSessionStore|null, o: object, sessionid: string, tmp: FibSessionProxyTmp, jwt: boolean = false): FibSessionObjectProxy => {
    return new Proxy(o || {}, {
        set: (target, key, value) => {
            if (key === 'sessionid') {
                throw new Error("Can't set sessionid.");
            }
            if (jwt && !util.isEmpty(target)) {
                throw new Error("Can't modify the JSON Web Token.");
            }
            if (target[key] !== value) {
                target[key] = value;
                if (!tmp && store)
                    store.set(sessionid, target);
            }
            return value;
        },
        deleteProperty: (target, key) => {
            if (jwt && !util.isEmpty(target)) {
                throw new Error("Can't modify the JSON Web Token.");
            }
            delete target[key];
            if (!tmp && store)
                store.set(sessionid, target);
            
            return false;
        },
        get: (target, key) => {
            if (key === 'sessionid') {
                return sessionid;
            } else {
                return target[key];
            }
        }
    });
}

export = proxy;
