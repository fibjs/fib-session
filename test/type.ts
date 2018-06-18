import Session = require('../')
import util = require('util')

const session = new Session(new util.LruCache(20000), {
    timeout: 60 * 1000
})
