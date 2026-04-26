const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const { ISSUE_TYPES, PRIORITIES } = require('../constants/issue')

module.exports = (sequelize) => {
  class Issue extends Model {}
  Issue.init({
    id:        { type: DataTypes.STRING(36),  primaryKey: true, defaultValue: uuidv4 },
    issue_key: { type: DataTypes.STRING(20),  allowNull: false, unique: true },
    project_id:  { type: DataTypes.STRING(36), allowNull: false },
    type: {
      type: DataTypes.ENUM(...Object.values(ISSUE_TYPES)),
      allowNull: false
    },
    title:       { type: DataTypes.STRING(500), allowNull: false },
    description: { type: DataTypes.TEXT,        allowNull: true  },
    status_id:   { type: DataTypes.STRING(36),  allowNull: true  },
    priority: {
      type: DataTypes.ENUM(...Object.values(PRIORITIES)),
      defaultValue: PRIORITIES.MEDIUM
    },
    assignee_id:  { type: DataTypes.STRING(36), allowNull: true },
    reviewer_id:  { type: DataTypes.STRING(36), allowNull: true },
    reporter_id:  { type: DataTypes.STRING(36), allowNull: false },
    sprint_id:    { type: DataTypes.STRING(36), allowNull: true },
    parent_id:    { type: DataTypes.STRING(36), allowNull: true },
    story_points: { type: DataTypes.INTEGER,    allowNull: true },
    estimate:     { type: DataTypes.INTEGER,    allowNull: true },
    due_date:     { type: DataTypes.DATEONLY,   allowNull: true },
    version:      { type: DataTypes.INTEGER,    defaultValue: 1 }
  }, {
    sequelize,
    tableName: 'issues',
    timestamps: true,
    underscored: true,
    paranoid: true
  })
  return Issue
}
