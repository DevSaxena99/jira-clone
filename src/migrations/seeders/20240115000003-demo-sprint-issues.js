'use strict'
const { v4: uuidv4 } = require('uuid')
const { PROJECT_ID, STATUS, ADMIN_ID, DEV1_ID, DEV2_ID } =
  require('./20240115000002-demo-project')

const SPRINT_ID = 'seed-sprint-demo-00000000000001'

const ISSUES = [
  { n: 1,  type: 'epic',    title: 'User Authentication System',           status: STATUS.IN_PROGRESS, priority: 'high',     assignee: DEV1_ID,  reporter: ADMIN_ID, points: 13 },
  { n: 2,  type: 'story',   title: 'Implement OAuth 2.0 login flow',       status: STATUS.IN_REVIEW,   priority: 'high',     assignee: DEV1_ID,  reporter: ADMIN_ID, points: 8,  parent: 1 },
  { n: 3,  type: 'story',   title: 'Add JWT refresh token rotation',       status: STATUS.IN_PROGRESS, priority: 'medium',   assignee: DEV2_ID,  reporter: ADMIN_ID, points: 5,  parent: 1 },
  { n: 4,  type: 'bug',     title: 'Fix session timeout on idle users',    status: STATUS.TODO,        priority: 'critical', assignee: DEV1_ID,  reporter: DEV2_ID,  points: 3  },
  { n: 5,  type: 'task',    title: 'Write auth API integration tests',     status: STATUS.TODO,        priority: 'medium',   assignee: DEV2_ID,  reporter: ADMIN_ID, points: 5  },
  { n: 6,  type: 'story',   title: 'Build sprint board UI components',     status: STATUS.DONE,        priority: 'high',     assignee: DEV2_ID,  reporter: ADMIN_ID, points: 8  },
  { n: 7,  type: 'task',    title: 'Set up Redis caching layer',           status: STATUS.DONE,        priority: 'medium',   assignee: DEV1_ID,  reporter: ADMIN_ID, points: 3  },
  { n: 8,  type: 'bug',     title: 'Slow query on board state endpoint',   status: STATUS.IN_PROGRESS, priority: 'high',     assignee: DEV2_ID,  reporter: DEV1_ID,  points: 2  },
  { n: 9,  type: 'subtask', title: 'Add FULLTEXT index to issues table',   status: STATUS.DONE,        priority: 'low',      assignee: DEV1_ID,  reporter: DEV2_ID,  points: 1,  parent: 8 },
  { n: 10, type: 'story',   title: 'Real-time board sync via WebSockets',  status: STATUS.IN_REVIEW,   priority: 'high',     assignee: DEV2_ID,  reporter: ADMIN_ID, points: 8  }
]

module.exports = {
  async up (queryInterface) {
    const now = new Date()

    await queryInterface.bulkInsert('sprints', [{
      id: SPRINT_ID, project_id: PROJECT_ID, name: 'Sprint 1',
      goal: 'Ship the authentication system and real-time board',
      start_date: '2024-01-15', end_date: '2024-01-29',
      status: 'active', velocity: null, completed_at: null,
      created_at: now, updated_at: now
    }], { ignoreDuplicates: true })

    const keyMap = {}
    const issueRows = ISSUES.map(i => {
      const id = uuidv4()
      keyMap[i.n] = id
      return {
        id, issue_key: `DEMO-${i.n}`,
        project_id: PROJECT_ID, sprint_id: SPRINT_ID,
        type: i.type, title: i.title,
        status_id: i.status, priority: i.priority,
        assignee_id: i.assignee, reporter_id: i.reporter,
        story_points: i.points || null,
        parent_id: null,
        version: 1, deleted_at: null,
        created_at: new Date(now.getTime() + i.n * 60000),
        updated_at: new Date(now.getTime() + i.n * 60000)
      }
    })

    // Second pass: set parent_id using the keyMap
    for (const i of ISSUES) {
      if (i.parent) issueRows[i.n - 1].parent_id = keyMap[i.parent]
    }

    await queryInterface.bulkInsert('issues', issueRows, { ignoreDuplicates: true })

    const getLabelIssue = (n) => issueRows[n - 1].id
    await queryInterface.bulkInsert('issue_labels', [
      { issue_id: getLabelIssue(2),  label_id: 'seed-label-auth-000000000003'   },
      { issue_id: getLabelIssue(2),  label_id: 'seed-label-backend-00000000001' },
      { issue_id: getLabelIssue(3),  label_id: 'seed-label-auth-000000000003'   },
      { issue_id: getLabelIssue(8),  label_id: 'seed-label-perf-000000000004'   },
      { issue_id: getLabelIssue(10), label_id: 'seed-label-backend-00000000001' },
      { issue_id: getLabelIssue(10), label_id: 'seed-label-frontend-0000000002' }
    ], { ignoreDuplicates: true })

    await queryInterface.bulkInsert('issue_watchers', [
      { issue_id: getLabelIssue(1), user_id: ADMIN_ID, created_at: now, updated_at: now },
      { issue_id: getLabelIssue(2), user_id: DEV2_ID,  created_at: now, updated_at: now },
      { issue_id: getLabelIssue(4), user_id: ADMIN_ID, created_at: now, updated_at: now },
      { issue_id: getLabelIssue(4), user_id: DEV1_ID,  created_at: now, updated_at: now }
    ], { ignoreDuplicates: true })
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('issue_watchers', {}, {})
    await queryInterface.bulkDelete('issue_labels',   {}, {})
    await queryInterface.bulkDelete('issues',  { project_id: PROJECT_ID })
    await queryInterface.bulkDelete('sprints', { id: SPRINT_ID })
  }
}
