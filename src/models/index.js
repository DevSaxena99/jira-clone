const { Sequelize } = require('sequelize')
const dbConfig      = require('../config/database')

const env    = process.env.NODE_ENV || 'development'
const config = dbConfig[env]

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
)

const User = require('./User')(sequelize)

// Remaining models are registered in Phases 2–4.
// Associations are declared in models/associations.js (Phase 2).

module.exports = { sequelize, Sequelize, User }
