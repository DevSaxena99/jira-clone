const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

module.exports = (sequelize) => {
  class Notification extends Model {}
  Notification.init({
    id:       { type: DataTypes.STRING(36), primaryKey: true, defaultValue: uuidv4 },
    user_id:  { type: DataTypes.STRING(36), allowNull: false },
    actor_id: { type: DataTypes.STRING(36), allowNull: true  },
    event_type:    { type: DataTypes.STRING(50), allowNull: false },
    resource_type: {
      type: DataTypes.ENUM('issue', 'comment', 'sprint'),
      allowNull: false
    },
    resource_id: { type: DataTypes.STRING(36), allowNull: false },
    message:     { type: DataTypes.TEXT,       allowNull: false },
    metadata:    { type: DataTypes.JSON,       allowNull: true  },
    read:        { type: DataTypes.BOOLEAN,    defaultValue: false }
  }, {
    sequelize,
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    updatedAt: false
  })
  return Notification
}
