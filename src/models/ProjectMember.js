const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProjectMember extends Model {}
  ProjectMember.init({
    project_id: { type: DataTypes.STRING(36), primaryKey: true },
    user_id:    { type: DataTypes.STRING(36), primaryKey: true },
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'member'),
      defaultValue: 'member'
    }
  }, { sequelize, tableName: 'project_members', timestamps: true, underscored: true })
  return ProjectMember
}
