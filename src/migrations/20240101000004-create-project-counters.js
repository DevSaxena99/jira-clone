'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('project_counters', {
      project_id: {
        type: Sequelize.STRING(36),
        primaryKey: true,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onDelete: 'CASCADE'
      },
      next_issue_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('project_counters')
  }
}
