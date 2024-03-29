/// <reference types="fib-kv" />

declare namespace FibSessionNS {
    interface FibSessionInstance {
        store: FibSessionNS.Store;
        setup: Function;
        get(sid: FibSessionNS.IdNameType): any;
        remove(sid: FibSessionNS.IdNameType): any;

        cookie_filter: (r: FibSessionNS.HttpRequest) => void;
        api_filter: (r: FibSessionNS.HttpRequest) => void;

        api_token: (r: FibSessionNS.HttpRequest) => void;
    }

    interface FibSessionConstructor {
        new (conn: FibKV.FibKVInstance | Class_DbConnection | FibPoolNS.FibPool<Class_DbConnection>, opts?: FibSessionNS.Options): FibSessionNS.FibSessionInstance;
        prototype: FibSessionInstance
    }
}
