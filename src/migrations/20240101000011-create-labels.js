'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('labels', {
      id:         { type: Sequelize.STRING(36), primaryKey: true, allowNull: false },
      project_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'projects', key: 'id' }, onDelete: 'CASCADE'
      },
      name:  { type: Sequelize.STRING(100), allowNull: false },
      color: { type: Sequelize.STRING(7),   allowNull: true  },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    })
    await queryInterface.addIndex('labels', ['project_id', 'name'], {
      unique: true, name: 'unique_label_per_project'
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('labels')
  }
}
