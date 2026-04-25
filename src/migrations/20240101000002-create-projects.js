'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('projects', {
      id:          { type: Sequelize.STRING(36), primaryKey: true, allowNull: false },
      key:         { type: Sequelize.STRING(10),  allowNull: false, unique: true },
      name:        { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT,        allowNull: true  },
      owner_id:    {
        type: Sequelize.STRING(36),
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT'
      },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('projects')
  }
}
