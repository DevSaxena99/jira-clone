const svc = require('../services/projectService')

const list = async (req, res, next) => {
  try {
    const projects = await svc.list(req.user.id)
    res.json({ data: projects })
  } catch (e) { next(e) }
}

const create   = async (req, res, next) => {
  try {
    const result = await svc.create(req.body, req.user.id)
    res.status(201).json({ data: result })
  } catch (e) { next(e) }
}

const getOne   = async (req, res, next) => {
  try {
    const p = await svc.findById(req.params.id, req.user.id)
    res.json({ data: p })
  } catch (e) { next(e) }
}

const update   = async (req, res, next) => {
  try {
    const p = await svc.update(req.params.id, req.body, req.user.id)
    res.json({ data: p })
  } catch (e) { next(e) }
}

const getBoard = async (req, res, next) => {
  try {
    const board = await svc.getBoard(req.params.id, req.user.id)
    res.json({ data: board })
  } catch (e) { next(e) }
}

const getMembers = async (req, res, next) => {
  try {
    const members = await svc.getMembers(req.params.id, req.user.id)
    res.json({ data: members })
  } catch (e) { next(e) }
}

const addMember = async (req, res, next) => {
  try {
    const m = await svc.addMember(req.params.id, req.body, req.user.id)
    res.status(201).json({ data: m })
  } catch (e) { next(e) }
}

const removeMember = async (req, res, next) => {
  try {
    await svc.removeMember(req.params.id, req.params.userId, req.user.id)
    res.status(204).send()
  } catch (e) { next(e) }
}

const getWorkflow = async (req, res, next) => {
  try {
    const w = await svc.getWorkflow(req.params.id, req.user.id)
    res.json({ data: w })
  } catch (e) { next(e) }
}

const getActivity = async (req, res, next) => {
  try {
    const result = await svc.getActivity(req.params.id, req.user.id, req.query)
    res.json(result)
  } catch (e) { next(e) }
}

module.exports = { list, create, getOne, update, getBoard, getMembers, addMember, removeMember, getWorkflow, getActivity }
