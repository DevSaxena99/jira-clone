/**
 * Cache TTL (seconds) and rate limit configuration constants.
 */

const CACHE_TTL = {
  BOARD:   30,
  PROJECT: 300,
  SPRINT:  60,
  USER:    600,
  SEARCH:  15
}

const RATE_LIMITS = {
  API_MAX:          100,
  API_WINDOW_MS:    60 * 1000,        // 1 minute

  AUTH_MAX:         20,
  AUTH_WINDOW_MS:   15 * 60 * 1000,   // 15 minutes

  PRESENCE_TTL_SEC: 3600              // Redis presence key TTL (1 hour)
}

module.exports = { CACHE_TTL, RATE_LIMITS }
