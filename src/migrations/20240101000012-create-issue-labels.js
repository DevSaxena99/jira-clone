'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('issue_labels', {
      issue_id: {
        type: Sequelize.STRING(36), allowNull: false, primaryKey: true,
        references: { model: 'issues', key: 'id' }, onDelete: 'CASCADE'
      },
      label_id: {
        type: Sequelize.STRING(36), allowNull: false, primaryKey: true,
        references: { model: 'labels', key: 'id' }, onDelete: 'CASCADE'
      }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('issue_labels')
  }
}
