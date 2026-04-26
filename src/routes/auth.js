const router     = require('express').Router()
const ctrl       = require('../controllers/authController')
const { validate }  = require('../middleware/validate')
const { authenticate } = require('../middleware/auth')
const { authLimiter: _authLimiter } = require('../middleware/rateLimiter')
// Skip rate limiting in test env to avoid false 429s during CI
const authLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : _authLimiter
const v          = require('../validators/authValidators')

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, display_name]
 *             properties:
 *               email:        { type: string, format: email }
 *               password:     { type: string, minLength: 8 }
 *               display_name: { type: string }
 *     responses:
 *       201: { description: User created with JWT }
 *       409: { description: Email already in use }
 */
router.post('/register', authLimiter, validate(v.register), ctrl.register)

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and receive a JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: JWT returned }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authLimiter, validate(v.login), ctrl.login)

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout — blacklists the current JWT in Redis
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204: { description: Logged out }
 */
router.post('/logout', authenticate, ctrl.logout)

module.exports = router
