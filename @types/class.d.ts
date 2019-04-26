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

    interface FibSessionConstructor<T = Class_DbConnection> {
        new (conn: T, opts?: FibSessionNS.Options): void
        prototype: FibSessionInstance
    }
}
