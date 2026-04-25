const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

module.exports = (sequelize) => {
  class Project extends Model {}
  Project.init({
    id:          { type: DataTypes.STRING(36), primaryKey: true, defaultValue: uuidv4 },
    key:         { type: DataTypes.STRING(10),  allowNull: false, unique: true },
    name:        { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT,        allowNull: true  },
    owner_id:    { type: DataTypes.STRING(36),  allowNull: false }
  }, { sequelize, tableName: 'projects', timestamps: true, underscored: true })
  return Project
}
