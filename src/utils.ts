export const cache_size = (opts: FibSessionNS.StoreOptions) => opts.session_cache_size !== undefined ? opts.session_cache_size : 65536;

export const cache_timeout = (opts: FibSessionNS.StoreOptions) => opts.session_cache_timeout !== undefined ? opts.session_cache_timeout : 900000;

export const cache_delay = (opts: FibSessionNS.StoreOptions) => opts.session_cache_delay !== undefined ? opts.session_cache_delay : 100;

export const sid = (opts: FibSessionNS.StoreOptions) => opts.session_id_name !== undefined ? opts.session_id_name : 'sessionID';
export const jwt_algo = (opts: FibSessionNS.StoreOptions) => opts.session_jwt_algo !== undefined ? opts.session_jwt_algo : null;
export const jwt_key = (opts: FibSessionNS.StoreOptions) => opts.session_jwt_key !== undefined ? opts.session_jwt_key : null;
