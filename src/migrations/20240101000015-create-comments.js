'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('comments', {
      id:       { type: Sequelize.STRING(36), primaryKey: true, allowNull: false },
      issue_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'issues', key: 'id' }, onDelete: 'CASCADE'
      },
      author_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT'
      },
      parent_id: {
        type: Sequelize.STRING(36), allowNull: true,   // threading
        references: { model: 'comments', key: 'id' }, onDelete: 'SET NULL'
      },
      content:    { type: Sequelize.TEXT,    allowNull: false },
      mentions:   { type: Sequelize.JSON,    allowNull: true  },  // [userId, ...]
      edited_at:  { type: Sequelize.DATE,    allowNull: true  },
      deleted_at: { type: Sequelize.DATE,    allowNull: true  },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('comments')
  }
}
