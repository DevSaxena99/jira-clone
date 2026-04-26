const { v4: uuidv4 }   = require('uuid')
const { Notification } = require('../models')
const eventBus         = require('../events/eventBus')
const AppError         = require('../utils/AppError')
const { paginate }     = require('../utils/pagination')
const { ERROR_CODES }          = require('../constants/errors')
const { NOTIFICATION_EVENTS }  = require('../constants/events')

const list = async (userId, { cursor, limit, unread_only } = {}) => {
  const where = { user_id: userId }
  if (unread_only === 'true' || unread_only === true) where.read = false
  return paginate(Notification, { where, cursor, limit })
}

const markRead = async (userId, notifId) => {
  const n = await Notification.findOne({ where: { id: notifId, user_id: userId } })
  if (!n) throw new AppError('Notification not found', 404, ERROR_CODES.NOT_FOUND)
  return n.update({ read: true })
}

const markAllRead = async (userId) => {
  await Notification.update({ read: true }, { where: { user_id: userId, read: false } })
}

const getUnreadCount = async (userId) =>
  Notification.count({ where: { user_id: userId, read: false } })

// Internal — called by event listeners
const create = async ({ user_id, actor_id, actorId, event_type, resource_type, resource_id, message, metadata }) => {
  const notif = await Notification.create({
    id: uuidv4(),
    user_id,
    actor_id:      actor_id || actorId || null,
    event_type,
    resource_type,
    resource_id,
    message,
    metadata: metadata || null
  })
  eventBus.emit(NOTIFICATION_EVENTS.CREATED, { notification: notif })
  return notif
}

module.exports = { list, markRead, markAllRead, getUnreadCount, create }
