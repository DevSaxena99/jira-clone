'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('project_members', {
      project_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onDelete: 'CASCADE',
        primaryKey: true
      },
      user_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        primaryKey: true
      },
      role: {
        type: Sequelize.ENUM('owner', 'admin', 'member'),
        defaultValue: 'member',
        allowNull: false
      },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('project_members')
  }
}
