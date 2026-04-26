const svc = require('../services/notificationService')

const list = async (req, res, next) => {
  try {
    const result = await svc.list(req.user.id, req.query)
    res.json(result)
  } catch (e) { next(e) }
}

const markRead = async (req, res, next) => {
  try {
    const n = await svc.markRead(req.user.id, req.params.id)
    res.json({ data: n })
  } catch (e) { next(e) }
}

const markAllRead = async (req, res, next) => {
  try {
    await svc.markAllRead(req.user.id)
    res.status(204).end()
  } catch (e) { next(e) }
}

const unreadCount = async (req, res, next) => {
  try {
    const count = await svc.getUnreadCount(req.user.id)
    res.json({ data: { count } })
  } catch (e) { next(e) }
}

module.exports = { list, markRead, markAllRead, unreadCount }
