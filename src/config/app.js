const express    = require('express')
const cors       = require('cors')
const helmet     = require('helmet')
const morgan     = require('morgan')
const routes     = require('../routes')
const errorHandler = require('../middleware/errorHandler')

const createApp = () => {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }))
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'))
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.use('/api', routes)
  app.use(errorHandler)

  return app
}

module.exports = createApp
