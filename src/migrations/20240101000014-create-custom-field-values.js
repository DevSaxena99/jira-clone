'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('custom_field_values', {
      id:              { type: Sequelize.STRING(36), primaryKey: true, allowNull: false },
      issue_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'issues', key: 'id' }, onDelete: 'CASCADE'
      },
      custom_field_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'custom_fields', key: 'id' }, onDelete: 'CASCADE'
      },
      value:      { type: Sequelize.TEXT, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    })
    await queryInterface.addIndex('custom_field_values', ['issue_id', 'custom_field_id'], {
      unique: true, name: 'unique_value_per_issue_field'
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('custom_field_values')
  }
}
