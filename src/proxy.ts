/// <reference lib="es6" />

import util = require('util');

const proxy: FibSessionNS.SessionProxyGenerator = (
    store: FibSessionNS.Store | null,
    o: object,
    sessionid: string,
    tmp: FibSessionNS.ProxyTmp, jwt: boolean = false
): FibSessionNS.SessionProxy => {
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
