const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProjectCounter extends Model {}
  ProjectCounter.init({
    project_id:        { type: DataTypes.STRING(36), primaryKey: true },
    next_issue_number: { type: DataTypes.INTEGER, defaultValue: 1 }
  }, { sequelize, tableName: 'project_counters', timestamps: false })
  return ProjectCounter
}
