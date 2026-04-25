'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('issues', {
      id:        { type: Sequelize.STRING(36),  primaryKey: true, allowNull: false },
      issue_key: { type: Sequelize.STRING(20),  allowNull: false, unique: true },
      project_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'projects', key: 'id' }, onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.ENUM('epic', 'story', 'task', 'bug', 'subtask'),
        allowNull: false
      },
      title:       { type: Sequelize.STRING(500), allowNull: false },
      description: { type: Sequelize.TEXT,        allowNull: true  },
      status_id: {
        type: Sequelize.STRING(36), allowNull: true,
        references: { model: 'workflow_statuses', key: 'id' }, onDelete: 'SET NULL'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium', allowNull: false
      },
      assignee_id: {
        type: Sequelize.STRING(36), allowNull: true,
        references: { model: 'users', key: 'id' }, onDelete: 'SET NULL'
      },
      reviewer_id: {
        type: Sequelize.STRING(36), allowNull: true,
        references: { model: 'users', key: 'id' }, onDelete: 'SET NULL'
      },
      reporter_id: {
        type: Sequelize.STRING(36), allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT'
      },
      sprint_id: {
        type: Sequelize.STRING(36), allowNull: true,   // NULL = backlog
        references: { model: 'sprints', key: 'id' }, onDelete: 'SET NULL'
      },
      parent_id: {
        type: Sequelize.STRING(36), allowNull: true,   // self-ref
        references: { model: 'issues', key: 'id' }, onDelete: 'SET NULL'
      },
      story_points: { type: Sequelize.INTEGER, allowNull: true },
      estimate:     { type: Sequelize.INTEGER, allowNull: true },  // minutes
      due_date:     { type: Sequelize.DATEONLY, allowNull: true },
      version:      { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      deleted_at:   { type: Sequelize.DATE, allowNull: true },
      created_at:   { allowNull: false, type: Sequelize.DATE },
      updated_at:   { allowNull: false, type: Sequelize.DATE }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('issues')
  }
}
