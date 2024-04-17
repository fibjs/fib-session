const jws = require('fib-jws');

function inputIsBuffer (bufOrString: string | Class_Buffer): bufOrString is Class_Buffer {
  return Buffer.isBuffer(bufOrString);
}

export function getToken (jwt_algo: string, opts?: FibSessionNS.FibJwtOptions) {
  return (obj: FibSessionNS.Object, key: string | Class_Buffer) => {
    if (!opts?.disable_auto_hex_key && !inputIsBuffer(key))
        key = new Buffer(key, 'hex')
    /**
     * jws.sign
     * header={ alg: 'HS256' } 
     * payload={uid: 12345, name: "Frank" } 
     * key='FIW8JWT'
     */
    return jws.sign({alg: jwt_algo}, obj, key);
  }
}

export function setTokenCookie (jwt_algo: string, cookie_name: string, opts?: FibSessionNS.FibJwtOptions) {
  return (r: FibSessionNS.HttpRequest, obj: FibSessionNS.Object, key: string | Class_Buffer) => {
    r.session = obj;
    if (!opts?.disable_auto_hex_key && !inputIsBuffer(key))
        key = new Buffer(key, 'hex')
    r.sessionid = jws.sign({alg: jwt_algo}, obj, key);

    r.response.addCookie({
      name: cookie_name || 'sessionID',
      value: r.sessionid
      // expires: 
      // domain:
    } as Class_HttpCookie);
  };
}

export function getPayload (text: string, key: string | Class_Buffer, algo: string, opts?: FibSessionNS.FibJwtOptions) {
  if (!opts?.disable_auto_hex_key && !inputIsBuffer(key))
    key = new Buffer(key, 'hex')

  if (jws.verify(text, key, algo)) {
    var dc = jws.decode(text);
    if (dc && dc.payload) {
        return dc.payload;
    } else {
        throw new Error('JSON Web Token is missing payload.');
    }
  } else {
      throw new Error('JSON Web Token is error.');
  }
}

export function filter (
  r: FibSessionNS.HttpRequest,
  jwt_algo: string,
  jwt_key: string,
  cookie_name: string,
  proxy: FibSessionNS.SessionProxyGenerator,
  opts?: FibSessionNS.FibJwtOptions
) {
  let obj;
  if (r.sessionid) {
    obj = getPayload(r.sessionid, jwt_key, jwt_algo, opts);
  }
  
  r.session = proxy(null, obj, r.sessionid, true, true);
}
