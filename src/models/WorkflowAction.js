const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

module.exports = (sequelize) => {
  class WorkflowAction extends Model {}
  WorkflowAction.init({
    id:            { type: DataTypes.STRING(36), primaryKey: true, defaultValue: uuidv4 },
    transition_id: { type: DataTypes.STRING(36), allowNull: false },
    action_type: {
      type: DataTypes.ENUM('assign_reviewer', 'assign_user', 'set_field', 'notify_role'),
      allowNull: false
    },
    action_config: { type: DataTypes.JSON, allowNull: false }
  }, { sequelize, tableName: 'workflow_actions', timestamps: true, underscored: true })
  return WorkflowAction
}
