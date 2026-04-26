const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const { WORKFLOW_ACTION_TYPES } = require('../constants/workflow')

module.exports = (sequelize) => {
  class WorkflowAction extends Model {}
  WorkflowAction.init({
    id:            { type: DataTypes.STRING(36), primaryKey: true, defaultValue: uuidv4 },
    transition_id: { type: DataTypes.STRING(36), allowNull: false },
    action_type: {
      type: DataTypes.ENUM(...Object.values(WORKFLOW_ACTION_TYPES)),
      allowNull: false
    },
    action_config: { type: DataTypes.JSON, allowNull: false }
  }, { sequelize, tableName: 'workflow_actions', timestamps: true, underscored: true })
  return WorkflowAction
}
