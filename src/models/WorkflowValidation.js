const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

module.exports = (sequelize) => {
  class WorkflowValidation extends Model {}
  WorkflowValidation.init({
    id:            { type: DataTypes.STRING(36), primaryKey: true, defaultValue: uuidv4 },
    transition_id: { type: DataTypes.STRING(36), allowNull: false },
    validation_type: {
      type: DataTypes.ENUM(
        'required_field', 'assignee_required',
        'reviewer_required', 'custom_field_required'
      ),
      allowNull: false
    },
    validation_config: { type: DataTypes.JSON, allowNull: true }
  }, { sequelize, tableName: 'workflow_validations', timestamps: true, underscored: true })
  return WorkflowValidation
}
