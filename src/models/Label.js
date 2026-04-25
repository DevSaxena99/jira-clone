const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

module.exports = (sequelize) => {
  class Label extends Model {}
  Label.init({
    id:         { type: DataTypes.STRING(36), primaryKey: true, defaultValue: uuidv4 },
    project_id: { type: DataTypes.STRING(36), allowNull: false },
    name:       { type: DataTypes.STRING(100), allowNull: false },
    color:      { type: DataTypes.STRING(7),   allowNull: true  }
  }, { sequelize, tableName: 'labels', timestamps: true, underscored: true })
  return Label
}
