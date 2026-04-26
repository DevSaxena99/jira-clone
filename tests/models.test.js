const { v4: uuidv4 } = require('uuid')
const {
  sequelize, User, Project, ProjectCounter,
  WorkflowStatus, WorkflowTransition,
  Sprint, Issue, Label, Comment
} = require('../src/models')

// ── helpers ───────────────────────────────────────────────────────────────────

const makeUser = (overrides = {}) => User.create({
  id: uuidv4(),
  email: `u-${Date.now()}-${Math.random()}@test.com`,
  password_hash: '$2b$10$placeholder',
  display_name: 'Tester',
  ...overrides
})

const makeProject = async (ownerId) => {
  const project = await Project.create({
    id: uuidv4(), key: `P${Date.now()}`.slice(0, 10), name: 'Test Project', owner_id: ownerId
  })
  await ProjectCounter.create({ project_id: project.id, next_issue_number: 1 })
  return project
}

const makeTodoStatus = (projectId) => WorkflowStatus.create({
  id: uuidv4(), project_id: projectId, name: 'To Do', category: 'todo', position: 0
})

const { wipe } = require('./helpers')

// ── setup / teardown ──────────────────────────────────────────────────────────

beforeEach(wipe)
afterAll(async () => { await sequelize.close() })

// ── tests ─────────────────────────────────────────────────────────────────────

describe('User model', () => {
  it('creates a user and omits password_hash in toJSON', async () => {
    const user = await makeUser({ email: 'alice@test.com' })
    expect(user.id).toBeDefined()
    const json = user.toJSON()
    expect(json.email).toBe('alice@test.com')
    expect(json.password_hash).toBeUndefined()
  })
})

describe('Project → WorkflowStatus association', () => {
  it('fetches statuses through project.getStatuses()', async () => {
    const user    = await makeUser()
    const project = await makeProject(user.id)
    await makeTodoStatus(project.id)
    await WorkflowStatus.create({
      id: uuidv4(), project_id: project.id, name: 'Done', category: 'done', position: 1
    })

    const statuses = await project.getStatuses({ order: [['position', 'ASC']] })
    expect(statuses).toHaveLength(2)
    expect(statuses[0].name).toBe('To Do')
    expect(statuses[1].name).toBe('Done')
  })
})

describe('Issue → status, reporter associations', () => {
  it('creates an issue and loads status + reporter via associations', async () => {
    const user    = await makeUser()
    const project = await makeProject(user.id)
    const status  = await makeTodoStatus(project.id)

    const issue = await Issue.create({
      id: uuidv4(), issue_key: `${project.key}-1`,
      project_id: project.id, type: 'task', title: 'Test task',
      status_id: status.id, reporter_id: user.id, priority: 'medium', version: 1
    })

    const loaded = await Issue.findByPk(issue.id, {
      include: [
        { association: 'status' },
        { association: 'reporter' }
      ]
    })

    expect(loaded.status.name).toBe('To Do')
    expect(loaded.reporter.email).toBe(user.email)
  })
})

describe('Issue soft delete (paranoid)', () => {
  it('soft-deletes an issue — findAll excludes it, findAll({ paranoid:false }) includes it', async () => {
    const user    = await makeUser()
    const project = await makeProject(user.id)
    const status  = await makeTodoStatus(project.id)

    const issue = await Issue.create({
      id: uuidv4(), issue_key: `${project.key}-2`,
      project_id: project.id, type: 'bug', title: 'Bug',
      status_id: status.id, reporter_id: user.id, priority: 'high', version: 1
    })

    await issue.destroy()

    const visible = await Issue.findAll({ where: { id: issue.id } })
    expect(visible).toHaveLength(0)

    const withDeleted = await Issue.findAll({ where: { id: issue.id }, paranoid: false })
    expect(withDeleted).toHaveLength(1)
    expect(withDeleted[0].deleted_at).not.toBeNull()
  })
})

describe('Comment threading', () => {
  it('creates a root comment and a reply linked via parent_id', async () => {
    const user    = await makeUser()
    const project = await makeProject(user.id)
    const status  = await makeTodoStatus(project.id)

    const issue = await Issue.create({
      id: uuidv4(), issue_key: `${project.key}-3`,
      project_id: project.id, type: 'story', title: 'Story',
      status_id: status.id, reporter_id: user.id, priority: 'low', version: 1
    })

    const root = await Comment.create({
      id: uuidv4(), issue_id: issue.id, author_id: user.id,
      content: 'Root comment'
    })

    const reply = await Comment.create({
      id: uuidv4(), issue_id: issue.id, author_id: user.id,
      parent_id: root.id, content: 'Reply'
    })

    const loaded = await Comment.findByPk(root.id, { include: [{ association: 'replies' }] })
    expect(loaded.replies).toHaveLength(1)
    expect(loaded.replies[0].id).toBe(reply.id)
  })
})

describe('WorkflowTransition wildcard (from_status_id = NULL)', () => {
  it('allows a transition with null from_status_id to be created and fetched', async () => {
    const user    = await makeUser()
    const project = await makeProject(user.id)
    const todo    = await makeTodoStatus(project.id)

    const transition = await WorkflowTransition.create({
      id: uuidv4(), project_id: project.id,
      from_status_id: null,   // wildcard
      to_status_id: todo.id
    })

    const found = await WorkflowTransition.findByPk(transition.id)
    expect(found.from_status_id).toBeNull()
    expect(found.to_status_id).toBe(todo.id)
  })
})
