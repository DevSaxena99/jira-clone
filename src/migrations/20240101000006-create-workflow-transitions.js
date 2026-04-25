'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('workflow_transitions', {
      id:         { type: Sequelize.STRING(36), primaryKey: true, allowNull: false },
      project_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'projects', key: 'id' }, onDelete: 'CASCADE'
      },
      from_status_id: {
        type: Sequelize.STRING(36), allowNull: true,   // NULL = from any status
        references: { model: 'workflow_statuses', key: 'id' }, onDelete: 'CASCADE'
      },
      to_status_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'workflow_statuses', key: 'id' }, onDelete: 'CASCADE'
      },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('workflow_transitions')
  }
}
