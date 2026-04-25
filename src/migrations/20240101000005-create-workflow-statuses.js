'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('workflow_statuses', {
      id:         { type: Sequelize.STRING(36), primaryKey: true, allowNull: false },
      project_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'projects', key: 'id' }, onDelete: 'CASCADE'
      },
      name:     { type: Sequelize.STRING(100), allowNull: false },
      category: {
        type: Sequelize.ENUM('todo', 'in_progress', 'in_review', 'done'),
        allowNull: false
      },
      color:    { type: Sequelize.STRING(7), allowNull: true },
      position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    })
    await queryInterface.addIndex('workflow_statuses', ['project_id', 'name'], {
      unique: true, name: 'unique_status_name_per_project'
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('workflow_statuses')
  }
}
