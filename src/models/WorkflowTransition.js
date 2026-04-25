const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

module.exports = (sequelize) => {
  class WorkflowTransition extends Model {}
  WorkflowTransition.init({
    id:             { type: DataTypes.STRING(36), primaryKey: true, defaultValue: uuidv4 },
    project_id:     { type: DataTypes.STRING(36), allowNull: false },
    from_status_id: { type: DataTypes.STRING(36), allowNull: true  },  // NULL = wildcard
    to_status_id:   { type: DataTypes.STRING(36), allowNull: false }
  }, { sequelize, tableName: 'workflow_transitions', timestamps: true, underscored: true })
  return WorkflowTransition
}
