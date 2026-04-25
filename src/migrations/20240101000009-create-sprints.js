'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sprints', {
      id:         { type: Sequelize.STRING(36), primaryKey: true, allowNull: false },
      project_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'projects', key: 'id' }, onDelete: 'CASCADE'
      },
      name:       { type: Sequelize.STRING(255), allowNull: false },
      goal:       { type: Sequelize.TEXT,         allowNull: true  },
      start_date: { type: Sequelize.DATEONLY,     allowNull: true  },
      end_date:   { type: Sequelize.DATEONLY,     allowNull: true  },
      status: {
        type: Sequelize.ENUM('planned', 'active', 'completed'),
        defaultValue: 'planned', allowNull: false
      },
      velocity:     { type: Sequelize.INTEGER,  allowNull: true },
      completed_at: { type: Sequelize.DATE,     allowNull: true },
      created_at:   { allowNull: false, type: Sequelize.DATE  },
      updated_at:   { allowNull: false, type: Sequelize.DATE  }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('sprints')
  }
}
