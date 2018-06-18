interface FibSessionObject {
    [key: string]: any;
}

type FibSessionIdNameType = string;
type FibSessionIdValueType = string;

type FibSessionObjectProxy = ProxyHandler<FibSessionObject>
interface FibSessionObjectProxyGenerator {
    (store: FibSessionStore|null, o: object, sessionid: string, tmp?: FibSessionProxyTmp, jwt?: boolean): FibSessionObjectProxy;
}
type FibSessionProxyTmp = any

interface FibSessionStore {
    get: Function;
    set: Function;
    remove: Function;
}
interface FibSessionStoreOptions {
    session_cache_size?: number;
    session_cache_timeout?: number;
    session_cache_delay?: number;
    session_id_name?: string;
    session_jwt_algo?: string;
    session_jwt_key?: string;
}
interface FibKvOptions {
    table_name?: string;
    key_name?: string;
    value_name?: string;
    key_size?: number;
    value_size?: number;
    cleanup_interval?: number;
    timeout?: number;
    prefix?: string;
    cache?: boolean;
    cache_size?: number;
    cache_timeout?: number;
}
interface FibSessionOptions extends FibSessionStoreOptions, FibKvOptions {
    expires?: number;
}
/* for Class_HttpCookie */
interface FibSessionCookieJsonPayload {
    name: string;
    value: string;
    expires?: Date;
}
interface FibSessionKVSource {
    get: Function;
    set: Function;
    remove: Function;
}
interface FibSessionStore extends FibSessionKVSource {}
