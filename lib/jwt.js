let jws = require('fib-jws');

function getToken (jwt_algo) {
  return (obj, key) => {
    //jws.sign
    //  header={ alg: 'HS256' } 
    //  payload={uid: 12345, name: "Frank" } 
    //  key='FIW8JWT'
    return jws.sign({alg: jwt_algo}, obj, key);
  }
}

function setTokenCookie (jwt_algo, cookie_name) {
  return (r, obj, key) => {
    r.session = obj;
    r.sessionid = jws.sign({alg: jwt_algo}, obj, key);

    r.response.addCookie({
      name: cookie_name || 'sessionID',
      value: r.sessionid
      //expire: 
      //domain:
    });
  };
}

function getPayload (text, key, algo) {
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

function filter (r, jwt_algo, jwt_key, cookie_name, proxy) {
  let obj;
  if (r.sessionid) {
    obj = getPayload(r.sessionid, jwt_key, jwt_algo);
  }
  
  r.session = proxy(null, obj, r.sessionid, true, true);
}

module.exports = {
  getToken,
  setTokenCookie,
  getPayload,
  filter
}