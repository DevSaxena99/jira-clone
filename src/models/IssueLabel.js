const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class IssueLabel extends Model {}
  IssueLabel.init({
    issue_id: { type: DataTypes.STRING(36), primaryKey: true },
    label_id: { type: DataTypes.STRING(36), primaryKey: true }
  }, { sequelize, tableName: 'issue_labels', timestamps: false })
  return IssueLabel
}
