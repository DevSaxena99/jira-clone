const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const { STATUS_CATEGORIES } = require('../constants/issue')

module.exports = (sequelize) => {
  class WorkflowStatus extends Model {}
  WorkflowStatus.init({
    id:         { type: DataTypes.STRING(36), primaryKey: true, defaultValue: uuidv4 },
    project_id: { type: DataTypes.STRING(36), allowNull: false },
    name:       { type: DataTypes.STRING(100), allowNull: false },
    category: {
      type: DataTypes.ENUM(...Object.values(STATUS_CATEGORIES)),
      allowNull: false
    },
    color:    { type: DataTypes.STRING(7),  allowNull: true },
    position: { type: DataTypes.INTEGER,   defaultValue: 0  }
  }, { sequelize, tableName: 'workflow_statuses', timestamps: true, underscored: true })
  return WorkflowStatus
}
