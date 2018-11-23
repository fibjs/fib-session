declare namespace FibSessionNS {
    interface Object {
        [key: string]: any;
    }
    
    type IdNameType = string;
    type IdValueType = string;
    
    type ObjectProxy = ProxyHandler<Object>

    interface ObjectProxyGenerator {
        (store: Store|null, o: object, sessionid: string, tmp?: ProxyTmp, jwt?: boolean): ObjectProxy;
    }
    type ProxyTmp = any
    
    interface Store {
        get: Function;
        set: Function;
        remove: Function;
    }
    interface StoreOptions {
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
    interface Options extends StoreOptions, FibKvOptions {
        expires?: number;
    }
    /* for Class_HttpCookie */
    interface CookieJsonPayload {
        name: string;
        value: string;
        expires?: Date;
    }
    interface KVSource {
        get: Function;
        set: Function;
        remove: Function;
    }
    interface Store extends KVSource {}
    
    interface HttpRequest extends Class_HttpRequest {
        sessionid?: string;
        session: ObjectProxy
    }
}
