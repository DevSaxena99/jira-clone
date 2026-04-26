const http    = require('http')
const { io: ioClient } = require('socket.io-client')
const createApp        = require('../src/config/app')
const { initSocket }   = require('../src/websocket')
const { registerListeners, reset } = require('../src/events')
const { sequelize }    = require('../src/models')
const { wipe }         = require('./helpers')
const request          = require('supertest')

let server, port, app, token, userId

const connect = (tk) =>
  new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${port}`, {
      auth: { token: tk },
      transports: ['websocket']
    })
    socket.on('connect',       () => resolve(socket))
    socket.on('connect_error', reject)
  })

const reRegister = async () => {
  const res = await request(app).post('/api/auth/register').send({
    email: 'ws@test.com', password: 'Password1!', display_name: 'WSUser'
  })
  token  = res.body.data.token
  userId = res.body.data.user.id
}

beforeAll(async () => {
  app    = createApp()
  server = http.createServer(app)
  const io = initSocket(server)
  reset()
  registerListeners(io)

  await new Promise(resolve => server.listen(0, resolve))
  port = server.address().port

  await reRegister()
})

beforeEach(async () => {
  await wipe()
  await reRegister() // recreate the user after each wipe
})

afterAll(async () => {
  await new Promise(r => server.close(r))
  await sequelize.close()
})

describe('WebSocket connection', () => {
  it('connects successfully with a valid JWT', async () => {
    const socket = await connect(token)
    expect(socket.connected).toBe(true)
    socket.disconnect()
  })

  it('rejects connection with an invalid JWT', async () => {
    await expect(connect('invalid.token.here')).rejects.toBeDefined()
  })
})

describe('WebSocket room events', () => {
  it('receives issue_created event after joining the project board room', async () => {
    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'WS Project', key: 'WSP' })
    expect(projRes.status).toBe(201)
    const projectId = projRes.body.data.project.id

    const socket = await connect(token)

    const received = new Promise(resolve => socket.on('issue_created', resolve))
    socket.emit('join:board', { projectId })
    await new Promise(r => setTimeout(r, 50))

    await request(app)
      .post(`/api/projects/${projectId}/issues`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'task', title: 'WS Task', priority: 'high' })

    const event = await Promise.race([
      received,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ])

    expect(event.event).toBe('issue_created')
    expect(event.data.title).toBe('WS Task')
    socket.disconnect()
  })

  it('receives notification:new in private user room', async () => {
    const socket = await connect(token)

    const received = new Promise(resolve => socket.on('notification:new', resolve))

    const eventBus = require('../src/events/eventBus')
    eventBus.emit('notification:created', {
      notification: {
        id:            'test-notif-id',
        user_id:       userId,
        event_type:    'mention',
        message:       'You were mentioned',
        resource_type: 'comment',
        resource_id:   'comment-id',
        created_at:    new Date().toISOString()
      }
    })

    const notif = await Promise.race([
      received,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ])

    expect(notif.event_type).toBe('mention')
    expect(notif.message).toBe('You were mentioned')
    socket.disconnect()
  })
})
