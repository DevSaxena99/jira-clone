const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class IssueWatcher extends Model {}
  IssueWatcher.init({
    issue_id: { type: DataTypes.STRING(36), primaryKey: true },
    user_id:  { type: DataTypes.STRING(36), primaryKey: true }
  }, { sequelize, tableName: 'issue_watchers', timestamps: true, underscored: true })
  return IssueWatcher
}
