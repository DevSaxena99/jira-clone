const express        = require('express')
const cors           = require('cors')
const helmet         = require('helmet')
const morgan         = require('morgan')
const swaggerUi      = require('swagger-ui-express')
const swaggerSpec    = require('./swagger')
const routes         = require('../routes')
const errorHandler   = require('../middleware/errorHandler')
const { apiLimiter } = require('../middleware/rateLimiter')

const createApp = () => {
  const app = express()

  // Disable CSP so Swagger UI assets load correctly
  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }))
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'))
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Jira Clone API Docs'
  }))
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec))

  // Skip rate limiting in test env to avoid Redis dep in CI
  if (process.env.NODE_ENV !== 'test') app.use('/api', apiLimiter)

  app.use('/api', routes)
  app.use(errorHandler)

  return app
}

module.exports = createApp
