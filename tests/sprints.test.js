const request = require('supertest')
const app     = require('../src/app')
const { wipe, apiRegister, authHeader, dbProject, dbWorkflow, dbIssue } = require('./helpers')

beforeEach(wipe)
afterAll(() => require('../src/models').sequelize.close())

describe('POST /api/projects/:projectId/sprints', () => {
  it('creates a sprint', async () => {
    const { user, token } = await apiRegister(app)
    const proj = await dbProject(user.id, 'SP')
    const res  = await request(app)
      .post(`/api/projects/${proj.id}/sprints`)
      .set(authHeader(token))
      .send({ name: 'Sprint 1', goal: 'Do things' })
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Sprint 1')
    expect(res.body.data.status).toBe('planned')
  })
})

describe('POST /api/sprints/:id/start', () => {
  it('transitions sprint to active', async () => {
    const { user, token } = await apiRegister(app)
    const proj  = await dbProject(user.id, 'SA')
    const create = await request(app)
      .post(`/api/projects/${proj.id}/sprints`)
      .set(authHeader(token))
      .send({ name: 'Sprint 1' })
    const sprintId = create.body.data.id
    const res = await request(app).post(`/api/sprints/${sprintId}/start`).set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('active')
  })

  it('rejects starting if another sprint is active', async () => {
    const { user, token } = await apiRegister(app)
    const proj = await dbProject(user.id, 'S2')
    const s1 = await request(app).post(`/api/projects/${proj.id}/sprints`).set(authHeader(token)).send({ name: 'S1' })
    const s2 = await request(app).post(`/api/projects/${proj.id}/sprints`).set(authHeader(token)).send({ name: 'S2' })
    await request(app).post(`/api/sprints/${s1.body.data.id}/start`).set(authHeader(token))
    const res = await request(app).post(`/api/sprints/${s2.body.data.id}/start`).set(authHeader(token))
    expect(res.status).toBe(422)
    expect(res.body.error).toBe('ACTIVE_SPRINT_EXISTS')
  })
})

describe('POST /api/sprints/:id/complete', () => {
  it('completes sprint and carries over issues', async () => {
    const { user, token } = await apiRegister(app)
    const proj  = await dbProject(user.id, 'SC')
    const wf    = await dbWorkflow(proj.id)
    const s1Res = await request(app).post(`/api/projects/${proj.id}/sprints`).set(authHeader(token)).send({ name: 'S1' })
    const sprintId = s1Res.body.data.id
    await request(app).post(`/api/sprints/${sprintId}/start`).set(authHeader(token))

    // Create an issue in the sprint
    const issue = await dbIssue(proj.id, user.id, wf.todo.id, { sprint_id: sprintId })

    const res = await request(app)
      .post(`/api/sprints/${sprintId}/complete`)
      .set(authHeader(token))
      .send({ carryOverIssueIds: [issue.id] })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('completed')

    // Verify carry-over issue has no sprint
    const { Issue } = require('../src/models')
    const refreshed = await Issue.findByPk(issue.id)
    expect(refreshed.sprint_id).toBeNull()
  })
})
