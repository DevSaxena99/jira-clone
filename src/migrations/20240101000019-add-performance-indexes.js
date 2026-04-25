'use strict'
module.exports = {
  async up(queryInterface) {
    // Issues — board and sprint queries
    await queryInterface.addIndex('issues', ['project_id', 'status_id'],   { name: 'idx_issues_project_status'   })
    await queryInterface.addIndex('issues', ['project_id', 'sprint_id'],   { name: 'idx_issues_project_sprint'   })
    await queryInterface.addIndex('issues', ['assignee_id'],               { name: 'idx_issues_assignee'         })
    await queryInterface.addIndex('issues', ['reporter_id'],               { name: 'idx_issues_reporter'         })
    await queryInterface.addIndex('issues', ['parent_id'],                 { name: 'idx_issues_parent'           })

    // Full-text search
    await queryInterface.addIndex('issues',   ['title', 'description'], { type: 'FULLTEXT', name: 'ft_issues'   })
    await queryInterface.addIndex('comments', ['content'],              { type: 'FULLTEXT', name: 'ft_comments' })

    // Activity feed
    await queryInterface.addIndex('activity_logs', ['project_id', 'created_at'], { name: 'idx_activity_project_time' })
    await queryInterface.addIndex('activity_logs', ['issue_id',   'created_at'], { name: 'idx_activity_issue_time'   })

    // Notifications inbox
    await queryInterface.addIndex('notifications', ['user_id', 'read', 'created_at'], { name: 'idx_notifications_user_read' })

    // Sprints
    await queryInterface.addIndex('sprints', ['project_id', 'status'], { name: 'idx_sprints_project_status' })
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('issues',        'idx_issues_project_status')
    await queryInterface.removeIndex('issues',        'idx_issues_project_sprint')
    await queryInterface.removeIndex('issues',        'idx_issues_assignee')
    await queryInterface.removeIndex('issues',        'idx_issues_reporter')
    await queryInterface.removeIndex('issues',        'idx_issues_parent')
    await queryInterface.removeIndex('issues',        'ft_issues')
    await queryInterface.removeIndex('comments',      'ft_comments')
    await queryInterface.removeIndex('activity_logs', 'idx_activity_project_time')
    await queryInterface.removeIndex('activity_logs', 'idx_activity_issue_time')
    await queryInterface.removeIndex('notifications', 'idx_notifications_user_read')
    await queryInterface.removeIndex('sprints',       'idx_sprints_project_status')
  }
}
