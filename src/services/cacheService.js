const { client: redis } = require('../config/redis')
const { CACHE_TTL }     = require('../constants/cache')

const get = async (key) => {
  const raw = await redis.get(key)
  return raw ? JSON.parse(raw) : null
}

const set = async (key, value, ttlSeconds) => {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
}

const del = async (...keys) => {
  const flat = keys.flat().filter(Boolean)
  if (flat.length) await redis.del(...flat)
}

const wrap = async (key, ttlSeconds, fetchFn) => {
  const cached = await get(key)
  if (cached !== null) return cached
  const fresh = await fetchFn()
  await set(key, fresh, ttlSeconds)
  return fresh
}

const keys = {
  board:   (projectId) => `board:${projectId}`,
  project: (id)        => `project:${id}`,
  sprint:  (id)        => `sprint:${id}:summary`,
  user:    (id)        => `user:${id}`
}

// Re-export TTL from constants for backward compat (callers use cache.TTL.BOARD etc.)
const TTL = CACHE_TTL

module.exports = { get, set, del, wrap, keys, TTL }
