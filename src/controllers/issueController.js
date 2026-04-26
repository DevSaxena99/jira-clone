const issueSvc   = require('../services/issueService')
const workflowSvc = require('../services/workflowService')

const create = async (req, res, next) => {
  try {
    const issue = await issueSvc.create(req.params.projectId, req.body, req.user.id)
    res.status(201).json({ data: issue })
  } catch (e) { next(e) }
}

const getOne = async (req, res, next) => {
  try {
    const issue = await issueSvc.findById(req.params.id)
    res.json({ data: issue })
  } catch (e) { next(e) }
}

const update = async (req, res, next) => {
  try {
    const issue = await issueSvc.update(req.params.id, req.body, req.user.id)
    res.json({ data: issue })
  } catch (e) { next(e) }
}

const remove = async (req, res, next) => {
  try {
    await issueSvc.remove(req.params.id, req.user.id)
    res.status(204).end()
  } catch (e) { next(e) }
}

const transition = async (req, res, next) => {
  try {
    const issue = await workflowSvc.workflowService(req.params.id, req.body.to_status_id, req.user.id)
    res.json({ data: issue })
  } catch (e) { next(e) }
}

const getTransitions = async (req, res, next) => {
  try {
    const t = await issueSvc.getTransitions(req.params.id)
    res.json({ data: t })
  } catch (e) { next(e) }
}

const addWatcher = async (req, res, next) => {
  try {
    await issueSvc.addWatcher(req.params.id, req.user.id)
    res.status(204).end()
  } catch (e) { next(e) }
}

const removeWatcher = async (req, res, next) => {
  try {
    await issueSvc.removeWatcher(req.params.id, req.user.id)
    res.status(204).end()
  } catch (e) { next(e) }
}

const getActivity = async (req, res, next) => {
  try {
    const result = await issueSvc.getActivity(req.params.id, req.query)
    res.json(result)
  } catch (e) { next(e) }
}

module.exports = { create, getOne, update, remove, transition, getTransitions, addWatcher, removeWatcher, getActivity }
