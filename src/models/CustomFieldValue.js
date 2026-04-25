const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

module.exports = (sequelize) => {
  class CustomFieldValue extends Model {}
  CustomFieldValue.init({
    id:              { type: DataTypes.STRING(36), primaryKey: true, defaultValue: uuidv4 },
    issue_id:        { type: DataTypes.STRING(36), allowNull: false },
    custom_field_id: { type: DataTypes.STRING(36), allowNull: false },
    value:           { type: DataTypes.TEXT,       allowNull: true  }
  }, { sequelize, tableName: 'custom_field_values', timestamps: true, underscored: true })
  return CustomFieldValue
}
