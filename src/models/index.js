const { Sequelize } = require('sequelize')
const dbConfig      = require('../config/database')

const env    = process.env.NODE_ENV || 'development'
const config = dbConfig[env]

const sequelize = new Sequelize(config.database, config.username, config.password, config)

// Register all models
const User              = require('./User')(sequelize)
const Project           = require('./Project')(sequelize)
const ProjectMember     = require('./ProjectMember')(sequelize)
const ProjectCounter    = require('./ProjectCounter')(sequelize)
const WorkflowStatus    = require('./WorkflowStatus')(sequelize)
const WorkflowTransition= require('./WorkflowTransition')(sequelize)
const WorkflowAction    = require('./WorkflowAction')(sequelize)
const WorkflowValidation= require('./WorkflowValidation')(sequelize)
const Sprint            = require('./Sprint')(sequelize)
const Issue             = require('./Issue')(sequelize)
const Label             = require('./Label')(sequelize)
const IssueLabel        = require('./IssueLabel')(sequelize)
const CustomField       = require('./CustomField')(sequelize)
const CustomFieldValue  = require('./CustomFieldValue')(sequelize)
const Comment           = require('./Comment')(sequelize)
const IssueWatcher      = require('./IssueWatcher')(sequelize)
const ActivityLog       = require('./ActivityLog')(sequelize)
const Notification      = require('./Notification')(sequelize)

const models = {
  User, Project, ProjectMember, ProjectCounter,
  WorkflowStatus, WorkflowTransition, WorkflowAction, WorkflowValidation,
  Sprint, Issue, Label, IssueLabel, CustomField, CustomFieldValue,
  Comment, IssueWatcher, ActivityLog, Notification
}

// Wire up all associations
require('./associations')(models)

module.exports = { sequelize, Sequelize, ...models }
