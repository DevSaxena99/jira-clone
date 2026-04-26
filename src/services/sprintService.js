const { v4: uuidv4 } = require('uuid')
const { sequelize, Sprint, Issue, WorkflowStatus } = require('../models')
const AppError  = require('../utils/AppError')
const eventBus  = require('../events/eventBus')
const { ERROR_CODES }   = require('../constants/errors')
const { SPRINT_EVENTS } = require('../constants/events')
const { STATUS_CATEGORIES, SPRINT_STATUSES } = require('../constants/issue')

const create = async (projectId, body, actorId) => {
  return Sprint.create({
    id: uuidv4(),
    project_id: projectId,
    name:       body.name,
    goal:       body.goal       || null,
    start_date: body.start_date || null,
    end_date:   body.end_date   || null,
    status: SPRINT_STATUSES.PLANNED
  })
}

const list = async (projectId) =>
  Sprint.findAll({
    where: { project_id: projectId },
    order: [['created_at', 'DESC']]
  })

const findById = async (sprintId) => {
  const sprint = await Sprint.findByPk(sprintId, {
    include: [{
      association: 'issues',
      include: [
        { association: 'status' },
        { association: 'assignee', attributes: ['id','display_name','avatar_url'] }
      ]
    }]
  })
  if (!sprint) throw new AppError('Sprint not found', 404, ERROR_CODES.NOT_FOUND)
  return sprint
}

const update = async (sprintId, body, actorId) => {
  const sprint = await Sprint.findByPk(sprintId)
  if (!sprint) throw new AppError('Sprint not found', 404, ERROR_CODES.NOT_FOUND)
  if (sprint.status === SPRINT_STATUSES.COMPLETED) {
    throw new AppError('Cannot update a completed sprint', 422, ERROR_CODES.INVALID_STATE)
  }
  return sprint.update(body)
}

const start = async (sprintId, actorId) => {
  const sprint = await Sprint.findByPk(sprintId)
  if (!sprint) throw new AppError('Sprint not found', 404, ERROR_CODES.NOT_FOUND)
  if (sprint.status !== SPRINT_STATUSES.PLANNED) {
    throw new AppError('Sprint is not in planned state', 422, ERROR_CODES.INVALID_STATE)
  }

  const active = await Sprint.findOne({
    where: { project_id: sprint.project_id, status: SPRINT_STATUSES.ACTIVE }
  })
  if (active) throw new AppError('There is already an active sprint in this project', 422, ERROR_CODES.ACTIVE_SPRINT_EXISTS)

  const updated = await sprint.update({ status: SPRINT_STATUSES.ACTIVE, start_date: sprint.start_date || new Date() })
  eventBus.emit(SPRINT_EVENTS.STARTED, { sprint: updated, actorId })
  return updated
}

const complete = async (sprintId, { carryOverIssueIds = [] }, actorId) => {
  return sequelize.transaction(async (t) => {
    const sprint = await Sprint.findByPk(sprintId, { transaction: t })
    if (!sprint) throw new AppError('Sprint not found', 404, ERROR_CODES.NOT_FOUND)
    if (sprint.status !== SPRINT_STATUSES.ACTIVE) {
      throw new AppError('Sprint is not active', 422, ERROR_CODES.INVALID_STATE)
    }

    const doneStatus = await WorkflowStatus.findOne({
      where: { project_id: sprint.project_id, category: STATUS_CATEGORIES.DONE },
      order: [['position', 'DESC']],
      transaction: t
    })

    const sprintIssues = await Issue.findAll({
      where: { sprint_id: sprintId },
      include: [{ association: 'status' }],
      transaction: t
    })

    let completedCount = 0
    let velocity = 0   // story points of issues that land in Done
    for (const issue of sprintIssues) {
      const isDone = issue.status?.category === STATUS_CATEGORIES.DONE
      if (isDone) {
        completedCount++
        velocity += issue.story_points || 0
      } else if (!carryOverIssueIds.includes(issue.id)) {
        if (doneStatus) await issue.update({ status_id: doneStatus.id }, { transaction: t })
        completedCount++
        velocity += issue.story_points || 0
      }
    }

    if (carryOverIssueIds.length) {
      await Issue.update(
        { sprint_id: null },
        { where: { id: carryOverIssueIds, sprint_id: sprintId }, transaction: t }
      )
    }

    const incompleteCount = carryOverIssueIds.length

    await sprint.update({
      status:       SPRINT_STATUSES.COMPLETED,
      velocity,
      completed_at: new Date()
    }, { transaction: t })

    eventBus.emit(SPRINT_EVENTS.COMPLETED, { sprint, velocity, incompleteCount, actorId })

    return {
      ...sprint.toJSON(),
      completedIssues: completedCount,
      carriedOver:     incompleteCount,
      totalIssues:     sprintIssues.length,
      velocity
    }
  })
}

module.exports = { create, list, findById, update, start, complete }
