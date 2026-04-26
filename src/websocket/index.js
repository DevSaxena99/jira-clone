const { Server }        = require('socket.io')
const { createAdapter } = require('@socket.io/redis-adapter')
const jwt               = require('jsonwebtoken')
const { pub, sub }      = require('../config/redis')
const presence          = require('./presence')
const { replayMissedEvents } = require('./replay')

let io

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || '*', methods: ['GET', 'POST'] },
    adapter: createAdapter(pub, sub)
  })

  // ── JWT auth middleware ───────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token
    if (!token) return next(new Error('UNAUTHORIZED'))
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
      socket.data.user = { id: decoded.id || decoded.sub, email: decoded.email }
      next()
    } catch {
      next(new Error('UNAUTHORIZED'))
    }
  })

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.data.user.id
    socket.join(`user:${userId}`)

    socket.on('join:board', async ({ projectId }) => {
      if (!projectId) return
      socket.join(`project:${projectId}`)
      await presence.join(projectId, 'board', socket).catch(console.error)
    })

    socket.on('leave:board', async ({ projectId }) => {
      if (!projectId) return
      socket.leave(`project:${projectId}`)
      await presence.leave(projectId, 'board', socket).catch(console.error)
    })

    socket.on('join:issue', async ({ issueId }) => {
      if (!issueId) return
      socket.join(`issue:${issueId}`)
      await presence.join(issueId, 'issue', socket).catch(console.error)
    })

    socket.on('leave:issue', async ({ issueId }) => {
      if (!issueId) return
      socket.leave(`issue:${issueId}`)
      await presence.leave(issueId, 'issue', socket).catch(console.error)
    })

    socket.on('replay', async ({ projectId, lastEventTimestamp }) => {
      await replayMissedEvents(socket, projectId, lastEventTimestamp).catch(console.error)
    })

    socket.on('disconnecting', async () => {
      await presence.cleanup(socket).catch(console.error)
    })
  })

  return io
}

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized — call initSocket(server) first')
  return io
}

module.exports = { initSocket, getIO }
