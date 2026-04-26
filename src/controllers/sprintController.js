const svc = require('../services/sprintService')

const create   = async (req, res, next) => {
  try {
    const s = await svc.create(req.params.projectId, req.body, req.user.id)
    res.status(201).json({ data: s })
  } catch (e) { next(e) }
}

const list     = async (req, res, next) => {
  try {
    const items = await svc.list(req.params.projectId)
    res.json({ data: items })
  } catch (e) { next(e) }
}

const getOne   = async (req, res, next) => {
  try {
    const s = await svc.findById(req.params.id)
    res.json({ data: s })
  } catch (e) { next(e) }
}

const update   = async (req, res, next) => {
  try {
    const s = await svc.update(req.params.id, req.body, req.user.id)
    res.json({ data: s })
  } catch (e) { next(e) }
}

const start    = async (req, res, next) => {
  try {
    const s = await svc.start(req.params.id, req.user.id)
    res.json({ data: s })
  } catch (e) { next(e) }
}

const complete = async (req, res, next) => {
  try {
    const s = await svc.complete(req.params.id, req.body, req.user.id)
    res.json({ data: s })
  } catch (e) { next(e) }
}

module.exports = { create, list, getOne, update, start, complete }
