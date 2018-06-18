/// <reference path="basic.d.ts" />

import http from "http";
    
export interface FibSessionHttpRequest extends http.Request {
    sessionid?: string;
    session: FibSessionObjectProxy
}

export declare class FibSessionClass {
    constructor (conn: any, opts?: FibSessionOptions);

    store: FibSessionStore;
    setup: Function;
    get(sid: FibSessionIdNameType): any;
    remove(sid: FibSessionIdNameType): any;

    cookie_filter: (r: FibSessionHttpRequest) => void;
    api_filter: (r: FibSessionHttpRequest) => void;

    api_token: (r: FibSessionHttpRequest) => void;
}

export as namespace FibSessionNS;
