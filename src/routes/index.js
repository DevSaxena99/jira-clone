const router = require('express').Router()

router.use('/auth',          require('./auth'))
router.use('/projects',      require('./projects'))
router.use('/issues',        require('./issues'))
router.use('/sprints',       require('./sprints').standalone)
router.use('/comments',      require('./comments').standalone)
router.use('/notifications', require('./notifications'))
router.use('/search',        require('./search'))

router.get('/health', (req, res) => res.json({ status: 'ok' }))

module.exports = router
