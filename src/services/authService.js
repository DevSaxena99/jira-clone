const bcrypt        = require('bcryptjs')
const jwt           = require('jsonwebtoken')
const { v4: uuidv4} = require('uuid')
const { User }      = require('../models')
const { client: redis } = require('../config/redis')
const AppError      = require('../utils/AppError')
const { ERROR_CODES } = require('../constants/errors')

const SALT_ROUNDS = 10
const secret      = () => process.env.JWT_SECRET || 'dev_secret'
const expiresIn   = () => process.env.JWT_EXPIRES_IN || '7d'

const register = async ({ email, password, display_name }) => {
  const existing = await User.findOne({ where: { email } })
  if (existing) throw new AppError('Email already in use', 409, ERROR_CODES.EMAIL_TAKEN)

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await User.create({ id: uuidv4(), email, password_hash, display_name })

  const token = _sign(user)
  return { user, token }
}

const login = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } })
  if (!user) throw new AppError('Invalid credentials', 401, ERROR_CODES.INVALID_CREDENTIALS)

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw new AppError('Invalid credentials', 401, ERROR_CODES.INVALID_CREDENTIALS)

  if (!user.is_active) throw new AppError('Account disabled', 403, ERROR_CODES.ACCOUNT_DISABLED)

  const token = _sign(user)
  return { user, token }
}

const logout = async (rawToken) => {
  if (!rawToken) return
  try {
    const decoded = jwt.verify(rawToken, secret())
    const ttl = decoded.exp - Math.floor(Date.now() / 1000)
    if (ttl > 0) await redis.set(`blacklist:${decoded.jti}`, '1', 'EX', ttl)
  } catch {
    // Already invalid — nothing to blacklist
  }
}

const _sign = (user) => {
  const jti = uuidv4()
  return jwt.sign({ id: user.id, sub: user.id, email: user.email, jti }, secret(), { expiresIn: expiresIn() })
}

module.exports = { register, login, logout }
