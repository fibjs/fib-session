import http from "http";

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

interface FibSessionHttpRequest extends http.Request {
    sessionid?: string;
    session: FibSessionObjectProxy
}

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
interface FibSessionOptions extends FibSessionStoreOptions {
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

interface FibSessionGenerator {
    (conn: any, opts: FibSessionOptions) 
}

declare module "fib-session" {
    
    export = FibSessionGenerator
}
