const { v4: uuidv4 } = require('uuid')
const { Op }         = require('sequelize')
const {
  sequelize, Issue, Project, ProjectCounter,
  WorkflowStatus, Label, IssueLabel, User, Sprint, ProjectMember
} = require('../models')
const AppError  = require('../utils/AppError')
const eventBus  = require('../events/eventBus')
const { ERROR_CODES }          = require('../constants/errors')
const { ISSUE_EVENTS }         = require('../constants/events')
const { STATUS_CATEGORIES, MUTABLE_ISSUE_FIELDS, TRACKED_ISSUE_FIELDS } = require('../constants/issue')

const ISSUE_INCLUDE = [
  { association: 'status' },
  { association: 'assignee', attributes: ['id','display_name','avatar_url'] },
  { association: 'reviewer', attributes: ['id','display_name','avatar_url'] },
  { association: 'reporter', attributes: ['id','display_name','avatar_url'] },
  { association: 'sprint',   attributes: ['id','name','status'] },
  { association: 'labels' },
  { association: 'watchers', attributes: ['id','display_name'] }
]

const create = async (projectId, body, reporterId) => {
  const project = await Project.findByPk(projectId)
  if (!project) throw new AppError('Project not found', 404, ERROR_CODES.NOT_FOUND)

  const member = await ProjectMember.findOne({ where: { project_id: projectId, user_id: reporterId } })
  if (!member) throw new AppError('Not a project member', 403, ERROR_CODES.FORBIDDEN)

  const defaultStatus = await WorkflowStatus.findOne({
    where: { project_id: projectId, category: STATUS_CATEGORIES.TODO },
    order: [['position', 'ASC']]
  })

  return sequelize.transaction(async (t) => {
    const [[row]] = await sequelize.query(
      'SELECT next_issue_number FROM project_counters WHERE project_id = ? FOR UPDATE',
      { replacements: [projectId], transaction: t }
    )
    const issueNumber = row.next_issue_number
    await sequelize.query(
      'UPDATE project_counters SET next_issue_number = next_issue_number + 1 WHERE project_id = ?',
      { replacements: [projectId], transaction: t }
    )
    const issueKey = `${project.key}-${issueNumber}`

    const issue = await Issue.create({
      id: uuidv4(), issue_key: issueKey, project_id: projectId,
      type:        body.type,
      title:       body.title,
      description: body.description,
      priority:    body.priority || 'medium',
      assignee_id: body.assignee_id  || null,
      sprint_id:   body.sprint_id    || null,
      parent_id:   body.parent_id    || null,
      story_points:body.story_points || null,
      estimate:    body.estimate     || null,
      due_date:    body.due_date     || null,
      status_id:   defaultStatus?.id || null,
      reporter_id: reporterId,
      version: 1
    }, { transaction: t })

    if (body.label_ids?.length) {
      await IssueLabel.bulkCreate(
        body.label_ids.map(lid => ({ issue_id: issue.id, label_id: lid })),
        { transaction: t }
      )
    }

    const loaded = await Issue.findByPk(issue.id, { include: ISSUE_INCLUDE, transaction: t })
    eventBus.emit(ISSUE_EVENTS.CREATED, { issue: loaded, actorId: reporterId, projectId })
    return loaded
  })
}

const findById = async (issueId) => {
  const issue = await Issue.findByPk(issueId, { include: ISSUE_INCLUDE })
  if (!issue) throw new AppError('Issue not found', 404, ERROR_CODES.NOT_FOUND)
  return issue
}

const update = async (issueId, body, actorId) => {
  const { version, label_ids, ...fields } = body

  return sequelize.transaction(async (t) => {
    const issue = await Issue.findByPk(issueId, { transaction: t, lock: t.LOCK.UPDATE })
    if (!issue) throw new AppError('Issue not found', 404, ERROR_CODES.NOT_FOUND)

    if (issue.version !== version) {
      throw new AppError(
        'Issue was modified by another user. Please refresh and retry.',
        409, ERROR_CODES.CONFLICT,
        { currentVersion: issue.version }
      )
    }

    const safe = {}
    for (const f of MUTABLE_ISSUE_FIELDS) {
      if (fields[f] !== undefined) safe[f] = fields[f]
    }

    const before = issue.toJSON()
    await issue.update({ ...safe, version: issue.version + 1 }, { transaction: t })

    if (label_ids !== undefined) {
      await IssueLabel.destroy({ where: { issue_id: issueId }, transaction: t })
      if (label_ids.length) {
        await IssueLabel.bulkCreate(
          label_ids.map(lid => ({ issue_id: issueId, label_id: lid })),
          { transaction: t }
        )
      }
    }

    const updated = await Issue.findByPk(issueId, { include: ISSUE_INCLUDE, transaction: t })
    eventBus.emit(ISSUE_EVENTS.UPDATED, { before, issue: updated, actorId })
    return updated
  })
}

const remove = async (issueId, actorId) => {
  const issue = await Issue.findByPk(issueId)
  if (!issue) throw new AppError('Issue not found', 404, ERROR_CODES.NOT_FOUND)
  await issue.destroy()
  eventBus.emit(ISSUE_EVENTS.DELETED, { issueId, projectId: issue.project_id, actorId })
}

const getTransitions = async (issueId) => {
  const issue = await Issue.findByPk(issueId)
  if (!issue) throw new AppError('Issue not found', 404, ERROR_CODES.NOT_FOUND)

  const { WorkflowTransition } = require('../models')
  return WorkflowTransition.findAll({
    where: {
      project_id: issue.project_id,
      from_status_id: { [Op.or]: [issue.status_id, null] }
    },
    include: [
      { association: 'fromStatus', attributes: ['id', 'name'] },
      { association: 'toStatus',   attributes: ['id', 'name'] }
    ]
  })
}

const addWatcher = async (issueId, userId) => {
  const { IssueWatcher } = require('../models')
  const issue = await Issue.findByPk(issueId)
  if (!issue) throw new AppError('Issue not found', 404, ERROR_CODES.NOT_FOUND)
  await IssueWatcher.findOrCreate({ where: { issue_id: issueId, user_id: userId } })
}

const removeWatcher = async (issueId, userId) => {
  const { IssueWatcher } = require('../models')
  await IssueWatcher.destroy({ where: { issue_id: issueId, user_id: userId } })
}

const getActivity = async (issueId, opts = {}) => {
  const { paginate } = require('../utils/pagination')
  const { ActivityLog } = require('../models')
  return paginate(ActivityLog, {
    where: { issue_id: issueId },
    include: [{ association: 'actor', attributes: ['id','display_name'] }],
    ...opts
  })
}

module.exports = { create, findById, update, remove, getTransitions, addWatcher, removeWatcher, getActivity }
