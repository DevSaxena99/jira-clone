const request = require('supertest')
const app     = require('../src/app')
const { wipe, apiRegister, authHeader, dbProject, dbWorkflow, dbIssue } = require('./helpers')
const { WorkflowStatus } = require('../src/models')

beforeEach(wipe)
afterAll(() => require('../src/models').sequelize.close())

describe('POST /api/projects/:projectId/issues', () => {
  it('creates an issue with sequential key', async () => {
    const { user, token } = await apiRegister(app)
    const proj = await dbProject(user.id, 'IS')
    const res  = await request(app)
      .post(`/api/projects/${proj.id}/issues`)
      .set(authHeader(token))
      .send({ type: 'task', title: 'First issue', priority: 'high' })
    expect(res.status).toBe(201)
    expect(res.body.data.issue_key).toMatch(/^IS/)
    expect(res.body.data.issue_key).toContain('-1')
  })

  it('increments key atomically', async () => {
    const { user, token } = await apiRegister(app)
    const proj = await dbProject(user.id, 'AK')
    await request(app).post(`/api/projects/${proj.id}/issues`).set(authHeader(token)).send({ type: 'task', title: 'A' })
    const res = await request(app).post(`/api/projects/${proj.id}/issues`).set(authHeader(token)).send({ type: 'task', title: 'B' })
    expect(res.body.data.issue_key).toContain('-2')
  })

  it('rejects non-member', async () => {
    const { user }   = await apiRegister(app)
    const { token: t2 } = await apiRegister(app)
    const proj = await dbProject(user.id, 'NM')
    const res  = await request(app)
      .post(`/api/projects/${proj.id}/issues`)
      .set(authHeader(t2))
      .send({ type: 'task', title: 'X' })
    expect(res.status).toBe(403)
  })
})

describe('PATCH /api/issues/:id', () => {
  it('updates with optimistic lock', async () => {
    const { user, token } = await apiRegister(app)
    const proj  = await dbProject(user.id, 'OL')
    const { todo } = await dbWorkflow(proj.id)
    const issue = await dbIssue(proj.id, user.id, todo.id)
    const res   = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set(authHeader(token))
      .send({ version: 1, title: 'Updated Title' })
    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('Updated Title')
    expect(res.body.data.version).toBe(2)
  })

  it('returns 409 on stale version', async () => {
    const { user, token } = await apiRegister(app)
    const proj  = await dbProject(user.id, 'SV')
    const { todo } = await dbWorkflow(proj.id)
    const issue = await dbIssue(proj.id, user.id, todo.id)
    const res   = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set(authHeader(token))
      .send({ version: 999, title: 'Conflict' })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('CONFLICT')
  })
})

describe('POST /api/issues/:id/transition', () => {
  it('follows allowed transition', async () => {
    const { user, token } = await apiRegister(app)
    const proj  = await dbProject(user.id, 'TR')
    const wf    = await dbWorkflow(proj.id)
    const issue = await dbIssue(proj.id, user.id, wf.todo.id)

    const res = await request(app)
      .post(`/api/issues/${issue.id}/transition`)
      .set(authHeader(token))
      .send({ to_status_id: wf.inProg.id })
    expect(res.status).toBe(200)
    expect(res.body.data.status.id).toBe(wf.inProg.id)
  })

  it('rejects invalid transition', async () => {
    const { user, token } = await apiRegister(app)
    const proj  = await dbProject(user.id, 'IT')
    const wf    = await dbWorkflow(proj.id)
    const issue = await dbIssue(proj.id, user.id, wf.todo.id)

    const res = await request(app)
      .post(`/api/issues/${issue.id}/transition`)
      .set(authHeader(token))
      .send({ to_status_id: wf.done.id }) // can't jump from todo to done
    expect(res.status).toBe(422)
    expect(res.body.error).toBe('INVALID_TRANSITION')
  })
})

describe('GET /api/issues/:id/transitions', () => {
  it('returns available transitions', async () => {
    const { user, token } = await apiRegister(app)
    const proj  = await dbProject(user.id, 'GT')
    const wf    = await dbWorkflow(proj.id)
    const issue = await dbIssue(proj.id, user.id, wf.todo.id)

    const res = await request(app)
      .get(`/api/issues/${issue.id}/transitions`)
      .set(authHeader(token))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })
})
