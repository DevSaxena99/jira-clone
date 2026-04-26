const request    = require('supertest')
const { v4: uuidv4 } = require('uuid')
const bcrypt     = require('bcryptjs')
const {
  sequelize, User, Project, ProjectMember, ProjectCounter,
  WorkflowStatus, WorkflowTransition, Sprint, Issue
} = require('../src/models')

// ── DB helpers ────────────────────────────────────────────────────────────────

const wipe = async () => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
  const tables = [
    'notifications', 'activity_logs',
    'issue_watchers', 'comments',
    'custom_field_values', 'custom_fields',
    'issue_labels', 'labels',
    'issues', 'sprints',
    'workflow_actions', 'workflow_validations', 'workflow_transitions',
    'workflow_statuses',
    'project_counters', 'project_members', 'projects', 'users'
  ]
  for (const t of tables) {
    await sequelize.query(`DELETE FROM \`${t}\``)
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
}

// ── Model factories ───────────────────────────────────────────────────────────

const dbUser = async (overrides = {}) =>
  User.create({
    id: uuidv4(),
    email: `u${Date.now()}${Math.random().toString(36).slice(2)}@test.com`,
    password_hash: await bcrypt.hash('Password1!', 10),
    display_name: 'Tester',
    ...overrides
  })

const dbProject = async (ownerId, keyPrefix = 'T') => {
  const key = `${keyPrefix}${Date.now()}`.slice(0, 10).toUpperCase()
  const p   = await Project.create({ id: uuidv4(), key, name: 'Test Project', owner_id: ownerId })
  await ProjectMember.create({ project_id: p.id, user_id: ownerId, role: 'owner' })
  await ProjectCounter.create({ project_id: p.id, next_issue_number: 1 })
  return p
}

const dbWorkflow = async (projectId) => {
  const statuses = await WorkflowStatus.bulkCreate([
    { id: uuidv4(), project_id: projectId, name: 'To Do',       category: 'todo',        position: 0 },
    { id: uuidv4(), project_id: projectId, name: 'In Progress',  category: 'in_progress', position: 1 },
    { id: uuidv4(), project_id: projectId, name: 'In Review',    category: 'in_review',   position: 2 },
    { id: uuidv4(), project_id: projectId, name: 'Done',         category: 'done',        position: 3 },
  ])
  const [todo, inProg, inRev, done] = statuses
  await WorkflowTransition.bulkCreate([
    { id: uuidv4(), project_id: projectId, from_status_id: todo.id,   to_status_id: inProg.id },
    { id: uuidv4(), project_id: projectId, from_status_id: inProg.id, to_status_id: inRev.id  },
    { id: uuidv4(), project_id: projectId, from_status_id: inRev.id,  to_status_id: inProg.id },
    { id: uuidv4(), project_id: projectId, from_status_id: inRev.id,  to_status_id: done.id   },
    { id: uuidv4(), project_id: projectId, from_status_id: null,      to_status_id: todo.id   },
  ])
  return { todo, inProg, inRev, done }
}

const dbIssue = async (projectId, reporterId, statusId, overrides = {}) => {
  const counter = await ProjectCounter.findOne({ where: { project_id: projectId } })
  const project = await Project.findByPk(projectId)
  const key     = `${project.key}-${counter.next_issue_number}`
  await counter.increment('next_issue_number')
  return Issue.create({
    id: uuidv4(), issue_key: key, project_id: projectId,
    type: 'task', title: 'Test Issue', priority: 'medium',
    status_id: statusId, reporter_id: reporterId, version: 1,
    ...overrides
  })
}

// ── API helpers ───────────────────────────────────────────────────────────────

const apiRegister = async (app, overrides = {}) => {
  const res = await request(app).post('/api/auth/register').send({
    email: `u${Date.now()}@test.com`,
    password: 'Password1!',
    display_name: 'Tester',
    ...overrides
  })
  return { user: res.body.data.user, token: res.body.data.token }
}

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

module.exports = {
  wipe, dbUser, dbProject, dbWorkflow, dbIssue,
  apiRegister, authHeader
}
