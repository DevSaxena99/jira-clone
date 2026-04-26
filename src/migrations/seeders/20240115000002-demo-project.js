'use strict'
const { v4: uuidv4 } = require('uuid')

const PROJECT_ID     = 'seed-project-demo-0000000000001'
const ADMIN_ID       = 'seed-user-admin-0000-000000000001'
const DEV1_ID        = 'seed-user-dev1-00000-000000000002'
const DEV2_ID        = 'seed-user-dev2-00000-000000000003'

const STATUS = {
  TODO:        'seed-status-todo-000000000000001',
  IN_PROGRESS: 'seed-status-inprog-0000000000002',
  IN_REVIEW:   'seed-status-inrev-00000000000003',
  DONE:        'seed-status-done-000000000000004'
}

module.exports = {
  async up (queryInterface) {
    const now = new Date()

    await queryInterface.bulkInsert('projects', [{
      id: PROJECT_ID, key: 'DEMO', name: 'Demo Project',
      description: 'A fully seeded demo project to showcase all platform features.',
      owner_id: ADMIN_ID, created_at: now, updated_at: now
    }], { ignoreDuplicates: true })

    await queryInterface.bulkInsert('project_members', [
      { project_id: PROJECT_ID, user_id: ADMIN_ID, role: 'owner',  created_at: now, updated_at: now },
      { project_id: PROJECT_ID, user_id: DEV1_ID,  role: 'member', created_at: now, updated_at: now },
      { project_id: PROJECT_ID, user_id: DEV2_ID,  role: 'member', created_at: now, updated_at: now }
    ], { ignoreDuplicates: true })

    await queryInterface.bulkInsert('project_counters', [{
      project_id: PROJECT_ID, next_issue_number: 11
    }], { ignoreDuplicates: true })

    await queryInterface.bulkInsert('workflow_statuses', [
      { id: STATUS.TODO,        project_id: PROJECT_ID, name: 'To Do',       category: 'todo',        position: 0, created_at: now, updated_at: now },
      { id: STATUS.IN_PROGRESS, project_id: PROJECT_ID, name: 'In Progress', category: 'in_progress', position: 1, created_at: now, updated_at: now },
      { id: STATUS.IN_REVIEW,   project_id: PROJECT_ID, name: 'In Review',   category: 'in_review',   position: 2, created_at: now, updated_at: now },
      { id: STATUS.DONE,        project_id: PROJECT_ID, name: 'Done',        category: 'done',        position: 3, created_at: now, updated_at: now }
    ], { ignoreDuplicates: true })

    const transitions = [
      [STATUS.TODO,        STATUS.IN_PROGRESS],
      [STATUS.IN_PROGRESS, STATUS.IN_REVIEW  ],
      [STATUS.IN_REVIEW,   STATUS.IN_PROGRESS],
      [STATUS.IN_REVIEW,   STATUS.DONE       ],
      [null,               STATUS.TODO       ]
    ]
    await queryInterface.bulkInsert('workflow_transitions', transitions.map(([from, to]) => ({
      id: uuidv4(), project_id: PROJECT_ID,
      from_status_id: from, to_status_id: to,
      created_at: now, updated_at: now
    })), { ignoreDuplicates: true })

    await queryInterface.bulkInsert('labels', [
      { id: 'seed-label-backend-00000000001', project_id: PROJECT_ID, name: 'backend',  color: '#3B82F6', created_at: now, updated_at: now },
      { id: 'seed-label-frontend-0000000002', project_id: PROJECT_ID, name: 'frontend', color: '#10B981', created_at: now, updated_at: now },
      { id: 'seed-label-auth-000000000003',   project_id: PROJECT_ID, name: 'auth',     color: '#F59E0B', created_at: now, updated_at: now },
      { id: 'seed-label-perf-000000000004',   project_id: PROJECT_ID, name: 'perf',     color: '#EF4444', created_at: now, updated_at: now }
    ], { ignoreDuplicates: true })

    await queryInterface.bulkInsert('custom_fields', [
      {
        id: 'seed-cf-env-000000000000001', project_id: PROJECT_ID,
        name: 'Environment', field_type: 'dropdown',
        options: JSON.stringify(['development', 'staging', 'production']),
        required: false, position: 0, created_at: now, updated_at: now
      },
      {
        id: 'seed-cf-ac-0000000000000002', project_id: PROJECT_ID,
        name: 'Acceptance Criteria', field_type: 'text',
        options: null, required: false, position: 1, created_at: now, updated_at: now
      }
    ], { ignoreDuplicates: true })
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('custom_fields',        { project_id: PROJECT_ID })
    await queryInterface.bulkDelete('labels',               { project_id: PROJECT_ID })
    await queryInterface.bulkDelete('workflow_transitions', { project_id: PROJECT_ID })
    await queryInterface.bulkDelete('workflow_statuses',    { project_id: PROJECT_ID })
    await queryInterface.bulkDelete('project_counters',     { project_id: PROJECT_ID })
    await queryInterface.bulkDelete('project_members',      { project_id: PROJECT_ID })
    await queryInterface.bulkDelete('projects',             { id: PROJECT_ID })
  }
}

module.exports.PROJECT_ID = PROJECT_ID
module.exports.STATUS     = STATUS
module.exports.ADMIN_ID   = ADMIN_ID
module.exports.DEV1_ID    = DEV1_ID
module.exports.DEV2_ID    = DEV2_ID
