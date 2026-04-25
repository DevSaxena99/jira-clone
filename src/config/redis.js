const Redis = require('ioredis')

const url  = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const opts = { lazyConnect: true, maxRetriesPerRequest: 3 }

const client = new Redis(url, opts) // general cache + blacklist
const pub    = new Redis(url, opts) // socket.io pub
const sub    = new Redis(url, opts) // socket.io sub

module.exports = { client, pub, sub }
