exports.buffer_size = opts => opts.session_buffer_size !== undefined ? opts.session_buffer_size : 65536;

exports.buffer_timeout = opts => opts.session_buffer_timeout !== undefined ? opts.session_buffer_timeout : 1000; //900000;

exports.buffer_delay = opts => opts.session_buffer_delay !== undefined ? opts.session_buffer_delay : 100;

exports.sid = opts => opts.session_id_name !== undefined ? opts.session_id_name : 'sessionID';

exports.path = opts => opts.path !== undefined ? opts.path : '/session';
