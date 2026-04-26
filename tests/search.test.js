const request   = require('supertest')
const createApp = require('../src/config/app')
const { sequelize } = require('../src/models')
const { wipe, apiRegister, authHeader } = require('./helpers')

const app = createApp()
let token, projectId

beforeAll(async () => {
  await sequelize.sync({ force: true })
  // FULLTEXT indexes are in migrations, not in the model — add them here for tests
  await sequelize.query(
    'ALTER TABLE issues ADD FULLTEXT INDEX ft_issues (title, description)'
  ).catch(() => {})
  await sequelize.query(
    'ALTER TABLE comments ADD FULLTEXT INDEX ft_comments (content)'
  ).catch(() => {})
})
afterEach(wipe)
afterAll(async () => { await sequelize.close() })

beforeEach(async () => {
  const reg = await apiRegister(app)
  token = reg.token

  const proj = await request(app).post('/api/projects')
    .set(authHeader(token)).send({ name: 'Search Project', key: 'SRH' })
  projectId = proj.body.data.project.id

  await request(app).post(`/api/projects/${projectId}/issues`).set(authHeader(token))
    .send({ type: 'story', title: 'Add OAuth authentication', priority: 'high', story_points: 5 })
  await request(app).post(`/api/projects/${projectId}/issues`).set(authHeader(token))
    .send({ type: 'bug',   title: 'Fix login redirect bug',  priority: 'critical' })
  await request(app).post(`/api/projects/${projectId}/issues`).set(authHeader(token))
    .send({ type: 'task',  title: 'Update database schema',  priority: 'low' })
})

describe('GET /api/search — full-text', () => {
  it('returns issues matching the query string', async () => {
    const res = await request(app)
      .get(`/api/search?q=authentication&projectId=${projectId}`)
      .set(authHeader(token))

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body.data[0].title).toMatch(/OAuth/i)
  })

  it('returns empty array for no matches', async () => {
    const res = await request(app)
      .get(`/api/search?q=zzznomatch&projectId=${projectId}`)
      .set(authHeader(token))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(0)
  })
})

describe('GET /api/search — structured filters', () => {
  it('filters by priority without full-text query', async () => {
    const res = await request(app)
      .get(`/api/search?priority=critical&projectId=${projectId}`)
      .set(authHeader(token))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].priority).toBe('critical')
  })

  it('filters by type', async () => {
    const res = await request(app)
      .get(`/api/search?type=bug&projectId=${projectId}`)
      .set(authHeader(token))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].type).toBe('bug')
  })

  it('combines full-text with structured filter', async () => {
    const res = await request(app)
      .get(`/api/search?q=login&priority=critical&projectId=${projectId}`)
      .set(authHeader(token))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].title).toMatch(/login/i)
    expect(res.body.data[0].priority).toBe('critical')
  })
})

describe('GET /api/search — pagination', () => {
  it('respects limit and returns nextCursor when more results exist', async () => {
    const res = await request(app)
      .get(`/api/search?projectId=${projectId}&limit=2`)
      .set(authHeader(token))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.pagination.hasMore).toBe(true)
    expect(res.body.pagination.nextCursor).toBeDefined()
  })

  it('follows cursor to get next page', async () => {
    const page1 = await request(app)
      .get(`/api/search?projectId=${projectId}&limit=2`)
      .set(authHeader(token))
    const cursor = page1.body.pagination.nextCursor

    const page2 = await request(app)
      .get(`/api/search?projectId=${projectId}&limit=2&cursor=${cursor}`)
      .set(authHeader(token))

    expect(page2.status).toBe(200)
    expect(page2.body.data).toHaveLength(1)
    expect(page2.body.pagination.hasMore).toBe(false)
  })
})
