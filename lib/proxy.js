module.exports = (store, o, sessionid, tmp) => {
    return new Proxy(o || {}, {
        set: (target, key, value) => {
            if (target[key] !== value) {
                target[key] = value;
                if (!tmp)
                    store.set(sessionid, target);
            }
            return value;
        },
        deleteProperty: (target, key) => {
            delete target[key];
            if (!tmp)
                store.set(sessionid, target);
        },
    });
}