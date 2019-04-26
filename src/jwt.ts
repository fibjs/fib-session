const jws = require('fib-jws');

export function getToken (jwt_algo: string) {
  return (obj: FibSessionNS.Object, key: string) => {
    /**
     * jws.sign
     * header={ alg: 'HS256' } 
     * payload={uid: 12345, name: "Frank" } 
     * key='FIW8JWT'
     */
    return jws.sign({alg: jwt_algo}, obj, key);
  }
}

export function setTokenCookie (jwt_algo: string, cookie_name: string) {
  return (r: FibSessionNS.HttpRequest, obj: FibSessionNS.Object, key: string) => {
    r.session = obj;
    r.sessionid = jws.sign({alg: jwt_algo}, obj, key);

    r.response.addCookie({
      name: cookie_name || 'sessionID',
      value: r.sessionid
      // expires: 
      // domain:
    } as Class_HttpCookie);
  };
}

export function getPayload (text: string, key: string, algo: string) {
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

export function filter (r: FibSessionNS.HttpRequest, jwt_algo: string, jwt_key: string, cookie_name: string, proxy: FibSessionNS.SessionProxyGenerator) {
  let obj;
  if (r.sessionid) {
    obj = getPayload(r.sessionid, jwt_key, jwt_algo);
  }
  
  r.session = proxy(null, obj, r.sessionid, true, true);
}
