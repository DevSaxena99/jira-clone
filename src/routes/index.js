const router = require('express').Router()
const authRoutes = require('./auth')

router.use('/auth', authRoutes)

router.get('/health', (req, res) => res.json({ status: 'ok' }))

module.exports = router
