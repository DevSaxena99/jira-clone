const { Op }  = require('sequelize')
const {
  sequelize, Issue, WorkflowTransition, WorkflowValidation,
  WorkflowAction, WorkflowStatus, CustomFieldValue
} = require('../models')
const AppError  = require('../utils/AppError')
const eventBus  = require('../events/eventBus')
const { ERROR_CODES }  = require('../constants/errors')
const { ISSUE_EVENTS } = require('../constants/events')
const {
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_VALIDATION_TYPES,
  REVIEWER_STRATEGIES
} = require('../constants/workflow')
const { SET_FIELD_ALLOWED } = require('../constants/issue')

const ISSUE_INCLUDE = [
  { association: 'status'   },
  { association: 'assignee', attributes: ['id','display_name','avatar_url'] },
  { association: 'reporter', attributes: ['id','display_name'] }
]

const workflowService = async (issueId, toStatusId, actorId) => {
  return sequelize.transaction(async (t) => {

    const issue = await Issue.findByPk(issueId, {
      include: [{ association: 'status' }],
      transaction: t,
      lock: t.LOCK.UPDATE
    })
    if (!issue) throw new AppError('Issue not found', 404, ERROR_CODES.NOT_FOUND)

    const transition = await WorkflowTransition.findOne({
      where: {
        project_id:     issue.project_id,
        from_status_id: issue.status_id ?? null,
        to_status_id:   toStatusId
      },
      include: [
        { association: 'toStatus' },
        { association: 'actions' },
        { association: 'validations' }
      ],
      transaction: t
    })

    if (!transition) {
      const allowed = await WorkflowTransition.findAll({
        where: {
          project_id:     issue.project_id,
          from_status_id: issue.status_id ?? null
        },
        include: [{ association: 'toStatus' }],
        transaction: t
      })
      throw new AppError(
        `Cannot transition from '${issue.status?.name || 'unknown'}' to the requested status`,
        422, ERROR_CODES.INVALID_TRANSITION,
        { allowedTransitions: allowed.map(tr => tr.toStatus?.name).filter(Boolean) }
      )
    }

    const violations = []
    for (const v of transition.validations) {
      const msg = await _check(v, issue, t)
      if (msg) violations.push(msg)
    }
    if (violations.length > 0) {
      throw new AppError('Transition validation failed', 422, ERROR_CODES.VALIDATION_FAILED, { violations })
    }

    const [affected] = await Issue.update(
      { status_id: toStatusId, version: issue.version + 1 },
      { where: { id: issueId, version: issue.version }, transaction: t }
    )
    if (affected === 0) {
      const fresh = await Issue.findByPk(issueId, { transaction: t })
      throw new AppError('Issue was modified by another user.', 409, ERROR_CODES.CONFLICT, { currentVersion: fresh.version })
    }

    for (const action of transition.actions) {
      await _runAction(action, issue, actorId, t)
    }

    const updated = await Issue.findByPk(issueId, { include: ISSUE_INCLUDE, transaction: t })
    eventBus.emit(ISSUE_EVENTS.TRANSITIONED, {
      issue: updated, from: issue.status, to: transition.toStatus, actorId
    })

    return updated
  })
}

// ── validation handlers ───────────────────────────────────────────────────────

const _check = async (validation, issue, t) => {
  const { validation_type: type, validation_config: cfg } = validation

  if (type === WORKFLOW_VALIDATION_TYPES.REQUIRED_FIELD) {
    const field = cfg?.field
    if (!field) return null
    const val = issue[field]
    if (val === null || val === undefined || val === '') {
      return `'${field}' is required before this transition`
    }
  }

  if (type === WORKFLOW_VALIDATION_TYPES.ASSIGNEE_REQUIRED) {
    if (!issue.assignee_id) return 'An assignee is required before this transition'
  }

  if (type === WORKFLOW_VALIDATION_TYPES.REVIEWER_REQUIRED) {
    if (!issue.reviewer_id) return 'A reviewer is required before this transition'
  }

  if (type === WORKFLOW_VALIDATION_TYPES.CUSTOM_FIELD_REQUIRED) {
    const cfId = cfg?.custom_field_id
    if (!cfId) return null
    const val = await CustomFieldValue.findOne({
      where: { issue_id: issue.id, custom_field_id: cfId }, transaction: t
    })
    if (!val || !val.value) return `Custom field '${cfId}' is required before this transition`
  }

  return null
}

// ── action handlers ───────────────────────────────────────────────────────────

const _runAction = async (action, issue, actorId, t) => {
  const { action_type: type, action_config: cfg } = action

  if (type === WORKFLOW_ACTION_TYPES.ASSIGN_REVIEWER) {
    const reviewerId = cfg?.strategy === REVIEWER_STRATEGIES.REPORTER
      ? issue.reporter_id
      : cfg?.user_id
    if (reviewerId) {
      await Issue.update({ reviewer_id: reviewerId }, { where: { id: issue.id }, transaction: t })
    }
  }

  if (type === WORKFLOW_ACTION_TYPES.ASSIGN_USER) {
    if (cfg?.user_id) {
      await Issue.update({ assignee_id: cfg.user_id }, { where: { id: issue.id }, transaction: t })
    }
  }

  if (type === WORKFLOW_ACTION_TYPES.SET_FIELD) {
    if (cfg?.field && SET_FIELD_ALLOWED.includes(cfg.field)) {
      await Issue.update({ [cfg.field]: cfg.value }, { where: { id: issue.id }, transaction: t })
    }
  }
}

module.exports = { workflowService }
