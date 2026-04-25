const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

module.exports = (sequelize) => {
  class CustomField extends Model {}
  CustomField.init({
    id:         { type: DataTypes.STRING(36), primaryKey: true, defaultValue: uuidv4 },
    project_id: { type: DataTypes.STRING(36), allowNull: false },
    name:       { type: DataTypes.STRING(100), allowNull: false },
    field_type: {
      type: DataTypes.ENUM('text', 'number', 'dropdown', 'date'),
      allowNull: false
    },
    options:  { type: DataTypes.JSON,    allowNull: true  },
    required: { type: DataTypes.BOOLEAN, defaultValue: false },
    position: { type: DataTypes.INTEGER, defaultValue: 0   }
  }, { sequelize, tableName: 'custom_fields', timestamps: true, underscored: true })
  return CustomField
}
