exports.cache_size = opts => opts.session_cache_size !== undefined ? opts.session_cache_size : 65536;

exports.cache_timeout = opts => opts.session_cache_timeout !== undefined ? opts.session_cache_timeout : 900000;

exports.cache_delay = opts => opts.session_cache_delay !== undefined ? opts.session_cache_delay : 100;

exports.sid = opts => opts.session_id_name !== undefined ? opts.session_id_name : 'sessionID';
exports.jwt_algo = opts => opts.session_jwt_algo !== undefined ? opts.session_jwt_algo : null;
exports.jwt_key = opts => opts.session_jwt_key !== undefined ? opts.session_jwt_key : null;
