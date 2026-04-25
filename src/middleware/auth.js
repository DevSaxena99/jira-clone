const jwt           = require('jsonwebtoken')
const { client: redis } = require('../config/redis')
const AppError      = require('../utils/AppError')

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer '))
      throw new AppError('No token provided', 401, 'UNAUTHORIZED')

    const token   = header.split(' ')[1]
    const secret  = process.env.JWT_SECRET || 'dev_secret'
    const decoded = jwt.verify(token, secret)

    const blacklisted = await redis.get(`blacklist:${decoded.jti}`)
    if (blacklisted) throw new AppError('Token revoked', 401, 'TOKEN_REVOKED')

    req.user = { id: decoded.sub, email: decoded.email }
    next()
  } catch (err) {
    if (err instanceof AppError) return next(err)
    next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'))
  }
}

module.exports = { authenticate }
