export const cache_size = (opts: FibSessionStoreOptions) => opts.session_cache_size !== undefined ? opts.session_cache_size : 65536;

export const cache_timeout = (opts: FibSessionStoreOptions) => opts.session_cache_timeout !== undefined ? opts.session_cache_timeout : 900000;

export const cache_delay = (opts: FibSessionStoreOptions) => opts.session_cache_delay !== undefined ? opts.session_cache_delay : 100;

export const sid = (opts: FibSessionStoreOptions) => opts.session_id_name !== undefined ? opts.session_id_name : 'sessionID';
export const jwt_algo = (opts: FibSessionStoreOptions) => opts.session_jwt_algo !== undefined ? opts.session_jwt_algo : null;
export const jwt_key = (opts: FibSessionStoreOptions) => opts.session_jwt_key !== undefined ? opts.session_jwt_key : null;
