const request  = require('supertest')
const createApp = require('../src/config/app')
const { sequelize, User } = require('../src/models')

const app = createApp()

beforeAll(async () => {
  await sequelize.sync({ force: true })
})

afterEach(async () => {
  await User.destroy({ where: {}, truncate: false })
})

afterAll(async () => {
  await sequelize.close()
})

describe('POST /api/auth/register', () => {
  it('creates a user and returns a JWT', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'alice@test.com',
      password: 'Password1!',
      display_name: 'Alice'
    })
    expect(res.status).toBe(201)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.user.email).toBe('alice@test.com')
    expect(res.body.data.user.password_hash).toBeUndefined()
  })

  it('rejects duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'alice@test.com',
      password: 'Password1!',
      display_name: 'Alice'
    })
    const res = await request(app).post('/api/auth/register').send({
      email: 'alice@test.com',
      password: 'Password1!',
      display_name: 'Alice2'
    })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('EMAIL_TAKEN')
  })

  it('rejects missing fields with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'bad'
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'alice@test.com',
      password: 'Password1!',
      display_name: 'Alice'
    })
  })

  it('returns a JWT on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'alice@test.com',
      password: 'Password1!'
    })
    expect(res.status).toBe(200)
    expect(res.body.data.token).toBeDefined()
  })

  it('returns 401 on wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'alice@test.com',
      password: 'wrongpassword'
    })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('INVALID_CREDENTIALS')
  })

  it('returns 401 on unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com',
      password: 'Password1!'
    })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('INVALID_CREDENTIALS')
  })
})

describe('POST /api/auth/logout', () => {
  let token

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'bob@test.com',
      password: 'Password1!',
      display_name: 'Bob'
    })
    token = res.body.data.token
  })

  it('returns 204 on valid token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)
  })

  it('blacklists the token — subsequent logout returns 401', async () => {
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('TOKEN_REVOKED')
  })

  it('returns 401 when no token is sent', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(401)
  })
})
