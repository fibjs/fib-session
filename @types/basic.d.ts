declare namespace FibSessionNS {
    interface Object {
        [key: string]: any;
    }
    
    type IdNameType = string;
    type IdValueType = string;

    interface SessionObject {
        id?: string | number
        roles?: (string | number)[]
        
        [k: string]: any
    }
    
    interface SessionProxy extends ProxyHandler<SessionObject>, SessionObject {}

    interface SessionProxyGenerator {
        (store: Store|null, o: object, sessionid: string, tmp?: ProxyTmp, jwt?: boolean): SessionProxy;
    }
    type ProxyTmp = any
    
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
    interface Store {
        get: (sid: FibSessionNS.IdNameType) => any;
        set: (sid: FibSessionNS.IdNameType, obj: FibSessionNS.Object) => FibSessionNS.IdNameType;
        remove: (sid: FibSessionNS.IdNameType) => boolean;
    }
    
    interface HttpRequest extends Class_HttpRequest {
        sessionid?: string;
        session: SessionProxy
    }
}
