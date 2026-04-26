const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const { SPRINT_STATUSES } = require('../constants/issue')

module.exports = (sequelize) => {
  class Sprint extends Model {}
  Sprint.init({
    id:         { type: DataTypes.STRING(36), primaryKey: true, defaultValue: uuidv4 },
    project_id: { type: DataTypes.STRING(36), allowNull: false },
    name:       { type: DataTypes.STRING(255), allowNull: false },
    goal:       { type: DataTypes.TEXT,        allowNull: true  },
    start_date: { type: DataTypes.DATEONLY,    allowNull: true  },
    end_date:   { type: DataTypes.DATEONLY,    allowNull: true  },
    status: {
      type: DataTypes.ENUM(...Object.values(SPRINT_STATUSES)),
      defaultValue: SPRINT_STATUSES.PLANNED
    },
    velocity:     { type: DataTypes.INTEGER, allowNull: true },
    completed_at: { type: DataTypes.DATE,    allowNull: true }
  }, { sequelize, tableName: 'sprints', timestamps: true, underscored: true })
  return Sprint
}
