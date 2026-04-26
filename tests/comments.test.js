const request = require('supertest')
const app     = require('../src/app')
const { wipe, apiRegister, authHeader, dbProject, dbWorkflow, dbIssue } = require('./helpers')

beforeEach(wipe)
afterAll(() => require('../src/models').sequelize.close())

let user, token, proj, wf, issue

beforeEach(async () => {
  ;({ user, token } = await apiRegister(app))
  proj  = await dbProject(user.id, 'CM')
  wf    = await dbWorkflow(proj.id)
  issue = await dbIssue(proj.id, user.id, wf.todo.id)
})

describe('POST /api/issues/:issueId/comments', () => {
  it('creates a comment', async () => {
    const res = await request(app)
      .post(`/api/issues/${issue.id}/comments`)
      .set(authHeader(token))
      .send({ content: 'Hello world' })
    expect(res.status).toBe(201)
    expect(res.body.data.content).toBe('Hello world')
  })

  it('creates a reply', async () => {
    const parent = await request(app)
      .post(`/api/issues/${issue.id}/comments`)
      .set(authHeader(token))
      .send({ content: 'Parent' })
    const reply = await request(app)
      .post(`/api/issues/${issue.id}/comments`)
      .set(authHeader(token))
      .send({ content: 'Reply', parent_id: parent.body.data.id })
    expect(reply.status).toBe(201)
    expect(reply.body.data.parent_id).toBe(parent.body.data.id)
  })

  it('rejects double nesting', async () => {
    const parent = await request(app)
      .post(`/api/issues/${issue.id}/comments`)
      .set(authHeader(token))
      .send({ content: 'Parent' })
    const reply = await request(app)
      .post(`/api/issues/${issue.id}/comments`)
      .set(authHeader(token))
      .send({ content: 'Reply', parent_id: parent.body.data.id })
    const nested = await request(app)
      .post(`/api/issues/${issue.id}/comments`)
      .set(authHeader(token))
      .send({ content: 'Deeply nested', parent_id: reply.body.data.id })
    expect(nested.status).toBe(422)
  })
})

describe('GET /api/issues/:issueId/comments', () => {
  it('lists top-level comments with replies', async () => {
    await request(app).post(`/api/issues/${issue.id}/comments`).set(authHeader(token)).send({ content: 'C1' })
    await request(app).post(`/api/issues/${issue.id}/comments`).set(authHeader(token)).send({ content: 'C2' })
    const res = await request(app).get(`/api/issues/${issue.id}/comments`).set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(2)
  })
})

describe('PATCH /api/comments/:id', () => {
  it('author can edit', async () => {
    const c   = await request(app).post(`/api/issues/${issue.id}/comments`).set(authHeader(token)).send({ content: 'Old' })
    const res = await request(app).patch(`/api/comments/${c.body.data.id}`).set(authHeader(token)).send({ content: 'New' })
    expect(res.status).toBe(200)
    expect(res.body.data.content).toBe('New')
  })

  it('non-author cannot edit', async () => {
    const { token: t2 } = await apiRegister(app)
    const c   = await request(app).post(`/api/issues/${issue.id}/comments`).set(authHeader(token)).send({ content: 'Old' })
    const res = await request(app).patch(`/api/comments/${c.body.data.id}`).set(authHeader(t2)).send({ content: 'Hack' })
    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/comments/:id', () => {
  it('author can delete', async () => {
    const c   = await request(app).post(`/api/issues/${issue.id}/comments`).set(authHeader(token)).send({ content: 'Bye' })
    const res = await request(app).delete(`/api/comments/${c.body.data.id}`).set(authHeader(token))
    expect(res.status).toBe(204)
  })
})
