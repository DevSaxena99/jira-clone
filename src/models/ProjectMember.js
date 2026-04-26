const { Model, DataTypes } = require('sequelize')
const { ROLES } = require('../constants/roles')

module.exports = (sequelize) => {
  class ProjectMember extends Model {}
  ProjectMember.init({
    project_id: { type: DataTypes.STRING(36), primaryKey: true },
    user_id:    { type: DataTypes.STRING(36), primaryKey: true },
    role: {
      type: DataTypes.ENUM(...Object.values(ROLES)),
      defaultValue: ROLES.MEMBER
    }
  }, { sequelize, tableName: 'project_members', timestamps: true, underscored: true })
  return ProjectMember
}
