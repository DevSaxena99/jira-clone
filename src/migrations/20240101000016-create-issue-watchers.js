'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('issue_watchers', {
      issue_id: {
        type: Sequelize.STRING(36), allowNull: false, primaryKey: true,
        references: { model: 'issues', key: 'id' }, onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.STRING(36), allowNull: false, primaryKey: true,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('issue_watchers')
  }
}
