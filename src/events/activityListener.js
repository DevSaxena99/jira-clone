const { ActivityLog } = require('../models')
const eventBus        = require('./eventBus')
const { ISSUE_EVENTS, COMMENT_EVENTS, SPRINT_EVENTS } = require('../constants/events')
const { ACTIVITY_TYPES } = require('../constants/notification')

const log = async (projectId, issueId, actorId, eventType, payload = {}) => {
  try {
    await ActivityLog.create({
      project_id: projectId || null,
      issue_id:   issueId   || null,
      actor_id:   actorId,
      event_type: eventType,
      payload
    })
  } catch (err) {
    console.error('[ActivityListener] Failed to write log:', err.message)
  }
}

const invalidateBoard = ({ issue }) => {
  if (!issue?.project_id) return
  const cache = require('../services/cacheService')
  cache.del(cache.keys.board(issue.project_id)).catch(() => {})
}

const register = () => {
  eventBus.on(ISSUE_EVENTS.CREATED, ({ issue, actorId, projectId }) => {
    log(projectId, issue.id, actorId, ACTIVITY_TYPES.ISSUE_CREATED, {
      issue_key: issue.issue_key, type: issue.type, title: issue.title
    })
  })

  eventBus.on(ISSUE_EVENTS.UPDATED, ({ before, issue, actorId }) => {
    const changed = {}
    const { TRACKED_ISSUE_FIELDS } = require('../constants/issue')
    for (const f of TRACKED_ISSUE_FIELDS) {
      if (before[f] !== issue[f]) changed[f] = { from: before[f], to: issue[f] }
    }
    if (Object.keys(changed).length === 0) return
    log(issue.project_id, issue.id, actorId, ACTIVITY_TYPES.ISSUE_UPDATED, { changed })
  })

  eventBus.on(ISSUE_EVENTS.TRANSITIONED, ({ issue, from, to, actorId }) => {
    log(issue.project_id, issue.id, actorId, ACTIVITY_TYPES.STATUS_CHANGED, {
      from: from?.name, to: to?.name
    })
  })

  eventBus.on(ISSUE_EVENTS.MOVED, ({ issue, sprintId, actorId }) => {
    log(issue.project_id, issue.id, actorId, ACTIVITY_TYPES.ISSUE_MOVED, { sprint_id: sprintId })
  })

  eventBus.on(ISSUE_EVENTS.DELETED, ({ issueId, projectId, actorId }) => {
    log(projectId, issueId, actorId, ACTIVITY_TYPES.ISSUE_DELETED, {})
  })

  eventBus.on(COMMENT_EVENTS.CREATED, ({ comment, issue, actorId, mentions }) => {
    log(issue.project_id, issue.id, actorId, ACTIVITY_TYPES.COMMENT_ADDED, {
      comment_id: comment.id,
      mentions:   (mentions || []).map(m => m.userId)
    })
  })

  eventBus.on(COMMENT_EVENTS.UPDATED, ({ comment, actorId }) => {
    log(null, comment.issue_id, actorId, ACTIVITY_TYPES.COMMENT_UPDATED, { comment_id: comment.id })
  })

  eventBus.on(COMMENT_EVENTS.DELETED, ({ commentId, actorId }) => {
    log(null, null, actorId, ACTIVITY_TYPES.COMMENT_DELETED, { comment_id: commentId })
  })

  eventBus.on(SPRINT_EVENTS.STARTED, ({ sprint, actorId }) => {
    log(sprint.project_id, null, actorId, ACTIVITY_TYPES.SPRINT_STARTED, {
      sprint_id: sprint.id, name: sprint.name
    })
  })

  eventBus.on(SPRINT_EVENTS.COMPLETED, ({ sprint, velocity, incompleteCount, actorId }) => {
    log(sprint.project_id, null, actorId, ACTIVITY_TYPES.SPRINT_COMPLETED, {
      sprint_id: sprint.id, velocity, incomplete_count: incompleteCount
    })
  })

  // Invalidate board cache on any issue mutation
  eventBus.on(ISSUE_EVENTS.CREATED,      invalidateBoard)
  eventBus.on(ISSUE_EVENTS.UPDATED,      invalidateBoard)
  eventBus.on(ISSUE_EVENTS.TRANSITIONED, invalidateBoard)
  eventBus.on(ISSUE_EVENTS.MOVED,        invalidateBoard)
  eventBus.on(ISSUE_EVENTS.DELETED, ({ projectId }) => {
    const cache = require('../services/cacheService')
    cache.del(cache.keys.board(projectId)).catch(() => {})
  })
}

module.exports = { register }
