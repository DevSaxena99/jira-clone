const authService = require('../services/authService')

const register = async (req, res, next) => {
  try {
    const { user, token } = await authService.register(req.validated)
    res.status(201).json({ data: { user, token } })
  } catch (err) { next(err) }
}

const login = async (req, res, next) => {
  try {
    const { user, token } = await authService.login(req.validated)
    res.status(200).json({ data: { user, token } })
  } catch (err) { next(err) }
}

const logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    await authService.logout(token)
    res.status(204).send()
  } catch (err) { next(err) }
}

module.exports = { register, login, logout }
