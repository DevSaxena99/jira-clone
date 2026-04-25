'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('workflow_validations', {
      id:            { type: Sequelize.STRING(36), primaryKey: true, allowNull: false },
      transition_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'workflow_transitions', key: 'id' }, onDelete: 'CASCADE'
      },
      validation_type: {
        type: Sequelize.ENUM(
          'required_field', 'assignee_required',
          'reviewer_required', 'custom_field_required'
        ),
        allowNull: false
      },
      validation_config: { type: Sequelize.JSON, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('workflow_validations')
  }
}
