'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activity_logs', {
      id:         { type: Sequelize.STRING(36), primaryKey: true, allowNull: false },
      project_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'projects', key: 'id' }, onDelete: 'CASCADE'
      },
      issue_id: {
        type: Sequelize.STRING(36), allowNull: true,
        references: { model: 'issues', key: 'id' }, onDelete: 'SET NULL'
      },
      actor_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT'
      },
      event_type: { type: Sequelize.STRING(50), allowNull: false },
      payload:    { type: Sequelize.JSON,       allowNull: true  },
      created_at: { allowNull: false, type: Sequelize.DATE }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('activity_logs')
  }
}
