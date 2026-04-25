const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

module.exports = (sequelize) => {
  class ActivityLog extends Model {}
  ActivityLog.init({
    id:         { type: DataTypes.STRING(36), primaryKey: true, defaultValue: uuidv4 },
    project_id: { type: DataTypes.STRING(36), allowNull: false },
    issue_id:   { type: DataTypes.STRING(36), allowNull: true  },
    actor_id:   { type: DataTypes.STRING(36), allowNull: false },
    event_type: { type: DataTypes.STRING(50), allowNull: false },
    payload:    { type: DataTypes.JSON,       allowNull: true  }
  }, {
    sequelize,
    tableName: 'activity_logs',
    timestamps: true,
    underscored: true,
    updatedAt: false  // activity logs are append-only
  })
  return ActivityLog
}
