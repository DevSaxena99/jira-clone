'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id:      { type: Sequelize.STRING(36), primaryKey: true, allowNull: false },
      user_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      actor_id: {
        type: Sequelize.STRING(36), allowNull: true,
        references: { model: 'users', key: 'id' }, onDelete: 'SET NULL'
      },
      event_type:    { type: Sequelize.STRING(50), allowNull: false },
      resource_type: {
        type: Sequelize.ENUM('issue', 'comment', 'sprint'),
        allowNull: false
      },
      resource_id: { type: Sequelize.STRING(36), allowNull: false },
      message:     { type: Sequelize.TEXT,       allowNull: false },
      metadata:    { type: Sequelize.JSON,       allowNull: true  },
      read:        { type: Sequelize.BOOLEAN,    defaultValue: false },
      created_at:  { allowNull: false, type: Sequelize.DATE }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('notifications')
  }
}
