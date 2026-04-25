'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('workflow_actions', {
      id:            { type: Sequelize.STRING(36), primaryKey: true, allowNull: false },
      transition_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'workflow_transitions', key: 'id' }, onDelete: 'CASCADE'
      },
      action_type: {
        type: Sequelize.ENUM('assign_reviewer', 'assign_user', 'set_field', 'notify_role'),
        allowNull: false
      },
      action_config: { type: Sequelize.JSON, allowNull: false },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('workflow_actions')
  }
}
