const { sequelize, ActivityLog } = require('../src/models')
const eventBus = require('../src/events/eventBus')
const { registerListeners, reset } = require('../src/events')
const { v4: uuidv4 } = require('uuid')
const { wipe, dbUser, dbProject, dbWorkflow, dbIssue } = require('./helpers')

beforeAll(() => {
  reset()
  registerListeners(null) // null = no Socket.io in unit tests
})
beforeEach(wipe)
afterAll(async () => { await sequelize.close() })

describe('ActivityListener', () => {
  it('logs issue:created event to activity_logs', async () => {
    const user    = await dbUser()
    const project = await dbProject(user.id, 'ACT')
    const { todo } = await dbWorkflow(project.id)
    const issue   = await dbIssue(project.id, user.id, todo.id)

    eventBus.emit('issue:created', { issue, actorId: user.id, projectId: project.id })
    await new Promise(r => setTimeout(r, 100))

    const log = await ActivityLog.findOne({ where: { issue_id: issue.id, event_type: 'issue_created' } })
    expect(log).not.toBeNull()
    expect(log.actor_id).toBe(user.id)
    expect(log.project_id).toBe(project.id)
  })

  it('logs issue:transitioned with before/after payload', async () => {
    const user    = await dbUser()
    const project = await dbProject(user.id, 'ACT2')
    const { todo, inProg } = await dbWorkflow(project.id)
    const issue   = await dbIssue(project.id, user.id, todo.id)

    eventBus.emit('issue:transitioned', { issue, from: todo, to: inProg, actorId: user.id })
    await new Promise(r => setTimeout(r, 100))

    const log = await ActivityLog.findOne({ where: { issue_id: issue.id, event_type: 'status_changed' } })
    expect(log).not.toBeNull()
    expect(log.payload.from).toBe('To Do')
    expect(log.payload.to).toBe('In Progress')
  })

  it('logs comment:created event', async () => {
    const user    = await dbUser()
    const project = await dbProject(user.id, 'ACT3')
    const { todo } = await dbWorkflow(project.id)
    const issue   = await dbIssue(project.id, user.id, todo.id)

    eventBus.emit('comment:created', {
      comment: { id: uuidv4(), content: 'Hello', issue_id: issue.id },
      issue, actorId: user.id, mentions: []
    })
    await new Promise(r => setTimeout(r, 100))

    const log = await ActivityLog.findOne({ where: { issue_id: issue.id, event_type: 'comment_added' } })
    expect(log).not.toBeNull()
  })
})
