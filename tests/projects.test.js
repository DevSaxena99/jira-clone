const request = require('supertest')
const app     = require('../src/app')
const { wipe, apiRegister, authHeader, dbUser, dbProject, dbWorkflow } = require('./helpers')

beforeEach(wipe)
afterAll(() => require('../src/models').sequelize.close())

describe('POST /api/projects', () => {
  it('creates a project with default workflow', async () => {
    const { token } = await apiRegister(app)
    const res = await request(app)
      .post('/api/projects')
      .set(authHeader(token))
      .send({ name: 'My Project', key: 'MPR' })
    expect(res.status).toBe(201)
    expect(res.body.data.project.key).toBe('MPR')
    expect(res.body.data.statuses).toHaveLength(4)
  })

  it('rejects duplicate key', async () => {
    const { token } = await apiRegister(app)
    await request(app).post('/api/projects').set(authHeader(token)).send({ name: 'A', key: 'DUP' })
    const res = await request(app).post('/api/projects').set(authHeader(token)).send({ name: 'B', key: 'DUP' })
    expect(res.status).toBe(409)
  })

  it('requires auth', async () => {
    const res = await request(app).post('/api/projects').send({ name: 'X', key: 'KEY' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/projects/:id', () => {
  it('returns the project to a member', async () => {
    const { user, token } = await apiRegister(app)
    const proj = await dbProject(user.id, 'V')
    const res  = await request(app).get(`/api/projects/${proj.id}`).set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(proj.id)
  })

  it('returns 403 to non-member', async () => {
    const { user }    = await apiRegister(app)
    const { token: t2 } = await apiRegister(app)
    const proj = await dbProject(user.id, 'W')
    const res  = await request(app).get(`/api/projects/${proj.id}`).set(authHeader(t2))
    expect(res.status).toBe(403)
  })
})

describe('GET /api/projects/:id/board', () => {
  it('returns board with statuses', async () => {
    const { user, token } = await apiRegister(app)
    const proj = await dbProject(user.id, 'BD')
    const res  = await request(app).get(`/api/projects/${proj.id}/board`).set(authHeader(token))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data.statuses)).toBe(true)
  })
})

describe('GET /api/projects/:id/workflow', () => {
  it('returns statuses and transitions', async () => {
    const { token } = await apiRegister(app)
    const createRes = await request(app).post('/api/projects').set(authHeader(token)).send({ name: 'WF Project', key: 'WFLO' })
    const projId = createRes.body.data.project.id
    const res = await request(app).get(`/api/projects/${projId}/workflow`).set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body.data.statuses.length).toBeGreaterThan(0)
    expect(res.body.data.transitions.length).toBeGreaterThan(0)
  })
})

describe('POST /api/projects/:id/members', () => {
  it('owner can add a member', async () => {
    const { user, token } = await apiRegister(app)
    const other           = await dbUser()
    const proj            = await dbProject(user.id, 'MEM')
    const res = await request(app)
      .post(`/api/projects/${proj.id}/members`)
      .set(authHeader(token))
      .send({ user_id: other.id, role: 'member' })
    expect(res.status).toBe(201)
  })

  it('non-admin cannot add a member', async () => {
    const { user }        = await apiRegister(app)
    const { user: u2, token: t2 } = await apiRegister(app)
    const proj = await dbProject(user.id, 'MA')
    // Add u2 as plain member first
    const { ProjectMember } = require('../src/models')
    await ProjectMember.create({ project_id: proj.id, user_id: u2.id, role: 'member' })
    const other = await dbUser()
    const res   = await request(app)
      .post(`/api/projects/${proj.id}/members`)
      .set(authHeader(t2))
      .send({ user_id: other.id, role: 'member' })
    expect(res.status).toBe(403)
  })
})
