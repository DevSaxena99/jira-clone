const svc = require('../services/commentService')

const create = async (req, res, next) => {
  try {
    const c = await svc.create(req.params.issueId, req.body, req.user.id)
    res.status(201).json({ data: c })
  } catch (e) { next(e) }
}

const list = async (req, res, next) => {
  try {
    const items = await svc.list(req.params.issueId)
    res.json({ data: items })
  } catch (e) { next(e) }
}

const update = async (req, res, next) => {
  try {
    const c = await svc.update(req.params.id, req.body, req.user.id)
    res.json({ data: c })
  } catch (e) { next(e) }
}

const remove = async (req, res, next) => {
  try {
    await svc.remove(req.params.id, req.user.id)
    res.status(204).end()
  } catch (e) { next(e) }
}

module.exports = { create, list, update, remove }
