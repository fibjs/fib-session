declare namespace FibSessionNS {
    class FibSessionClass {
        constructor (conn: any, opts?: FibSessionNS.Options);

        store: FibSessionNS.Store;
        setup: Function;
        get(sid: FibSessionNS.IdNameType): any;
        remove(sid: FibSessionNS.IdNameType): any;

        cookie_filter: (r: FibSessionNS.HttpRequest) => void;
        api_filter: (r: FibSessionNS.HttpRequest) => void;

        api_token: (r: FibSessionNS.HttpRequest) => void;
    }
}
