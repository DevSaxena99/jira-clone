const rateLimit = require('express-rate-limit')
const { client: redis } = require('../config/redis')
const { RATE_LIMITS, CACHE_TTL } = require('../constants/cache')
const { ERROR_CODES } = require('../constants/errors')

class RedisStore {
  constructor (windowMs) { this.windowMs = windowMs }

  async increment (key) {
    const pipeline = redis.pipeline()
    pipeline.incr(key)
    pipeline.pttl(key)
    const results = await pipeline.exec()
    const count  = results[0][1]
    const pttl   = results[1][1]

    if (pttl === -1) await redis.pexpire(key, this.windowMs)

    const resetTime = new Date(Date.now() + (pttl > 0 ? pttl : this.windowMs))
    return { totalHits: count, resetTime }
  }

  async decrement (key) { await redis.decr(key) }
  async resetKey  (key) { await redis.del(key)  }
}

const isDev = process.env.NODE_ENV !== 'production'

const apiLimiter = rateLimit({
  windowMs: RATE_LIMITS.API_WINDOW_MS,
  max:      isDev ? 2000 : RATE_LIMITS.API_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  store: new RedisStore(RATE_LIMITS.API_WINDOW_MS),
  message: { error: ERROR_CODES.RATE_LIMITED, message: 'Too many requests. Please try again in a minute.' }
})

const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH_WINDOW_MS,
  max:      isDev ? 500 : RATE_LIMITS.AUTH_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  store: new RedisStore(RATE_LIMITS.AUTH_WINDOW_MS),
  message: { error: ERROR_CODES.RATE_LIMITED, message: 'Too many auth attempts. Please try again later.' }
})

module.exports = { apiLimiter, authLimiter }
