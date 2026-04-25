'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('custom_fields', {
      id:         { type: Sequelize.STRING(36), primaryKey: true, allowNull: false },
      project_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'projects', key: 'id' }, onDelete: 'CASCADE'
      },
      name:       { type: Sequelize.STRING(100), allowNull: false },
      field_type: {
        type: Sequelize.ENUM('text', 'number', 'dropdown', 'date'),
        allowNull: false
      },
      options:    { type: Sequelize.JSON,    allowNull: true  },  // for dropdown
      required:   { type: Sequelize.BOOLEAN, defaultValue: false },
      position:   { type: Sequelize.INTEGER, defaultValue: 0    },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    })
    await queryInterface.addIndex('custom_fields', ['project_id', 'name'], {
      unique: true, name: 'unique_custom_field_per_project'
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('custom_fields')
  }
}
