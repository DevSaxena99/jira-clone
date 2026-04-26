const { client: redis } = require('../config/redis')
const { RATE_LIMITS }   = require('../constants/cache')

const PRESENCE_TTL = RATE_LIMITS.PRESENCE_TTL_SEC

const _key      = (type, id) => type === 'board' ? `presence:board:${id}` : `presence:issue:${id}`
const _roomName = (type, id) => type === 'board' ? `project:${id}`         : `issue:${id}`

const join = async (resourceId, type, socket) => {
  const key   = _key(type, resourceId)
  const entry = JSON.stringify({
    userId:      socket.data.user.id,
    displayName: socket.data.user.displayName || socket.data.user.email,
    joinedAt:    new Date().toISOString()
  })

  await redis.hset(key, socket.id, entry)
  await redis.expire(key, PRESENCE_TTL)

  const viewers = await getViewers(resourceId, type)
  try {
    const { getIO } = require('./index')
    getIO().to(_roomName(type, resourceId)).emit('presence:update', { viewers })
  } catch {}
}

const leave = async (resourceId, type, socket) => {
  const key = _key(type, resourceId)
  await redis.hdel(key, socket.id)

  const viewers = await getViewers(resourceId, type)
  try {
    const { getIO } = require('./index')
    getIO().to(_roomName(type, resourceId)).emit('presence:update', { viewers })
  } catch {}
}

const cleanup = async (socket) => {
  for (const room of socket.rooms) {
    if (room.startsWith('project:')) {
      await redis.hdel(_key('board', room.replace('project:', '')), socket.id).catch(() => {})
    }
    if (room.startsWith('issue:')) {
      await redis.hdel(_key('issue', room.replace('issue:', '')), socket.id).catch(() => {})
    }
  }
}

const getViewers = async (resourceId, type) => {
  const key = _key(type, resourceId)
  const all = await redis.hgetall(key)
  if (!all) return []
  return Object.values(all).map(v => {
    try { return JSON.parse(v) } catch { return null }
  }).filter(Boolean)
}

module.exports = { join, leave, cleanup, getViewers }
