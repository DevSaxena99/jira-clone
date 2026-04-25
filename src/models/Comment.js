const { Model, DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

module.exports = (sequelize) => {
  class Comment extends Model {}
  Comment.init({
    id:        { type: DataTypes.STRING(36), primaryKey: true, defaultValue: uuidv4 },
    issue_id:  { type: DataTypes.STRING(36), allowNull: false },
    author_id: { type: DataTypes.STRING(36), allowNull: false },
    parent_id: { type: DataTypes.STRING(36), allowNull: true  },
    content:   { type: DataTypes.TEXT,       allowNull: false },
    mentions:  { type: DataTypes.JSON,       allowNull: true  },
    edited_at: { type: DataTypes.DATE,       allowNull: true  }
  }, {
    sequelize,
    tableName: 'comments',
    timestamps: true,
    underscored: true,
    paranoid: true  // soft delete via deleted_at
  })
  return Comment
}
