const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 }       = require('uuid')

module.exports = (sequelize) => {
  class User extends Model {
    toJSON() {
      const v = { ...this.get() }
      delete v.password_hash
      return v
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        defaultValue: uuidv4
      },
      email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
        validate: { isEmail: true }
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      display_name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      avatar_url: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    },
    {
      sequelize,
      tableName: 'users',
      timestamps: true,
      underscored: true
    }
  )

  return User
}
