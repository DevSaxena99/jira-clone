'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id:            { type: Sequelize.STRING(36), primaryKey: true, allowNull: false },
      email:         { type: Sequelize.STRING(255), unique: true, allowNull: false },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      display_name:  { type: Sequelize.STRING(255), allowNull: false },
      avatar_url:    { type: Sequelize.STRING(500), allowNull: true },
      is_active:     { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      created_at:    { allowNull: false, type: Sequelize.DATE },
      updated_at:    { allowNull: false, type: Sequelize.DATE }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('users')
  }
}
