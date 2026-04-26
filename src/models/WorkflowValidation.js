const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const { WORKFLOW_VALIDATION_TYPES } = require('../constants/workflow')

module.exports = (sequelize) => {
  class WorkflowValidation extends Model {}
  WorkflowValidation.init({
    id:            { type: DataTypes.STRING(36), primaryKey: true, defaultValue: uuidv4 },
    transition_id: { type: DataTypes.STRING(36), allowNull: false },
    validation_type: {
      type: DataTypes.ENUM(...Object.values(WORKFLOW_VALIDATION_TYPES)),
      allowNull: false
    },
    validation_config: { type: DataTypes.JSON, allowNull: true }
  }, { sequelize, tableName: 'workflow_validations', timestamps: true, underscored: true })
  return WorkflowValidation
}
