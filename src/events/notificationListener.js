const { IssueWatcher } = require('../models')
const notificationService = require('../services/notificationService')
const eventBus            = require('./eventBus')
const { ISSUE_EVENTS, COMMENT_EVENTS } = require('../constants/events')
const { NOTIFICATION_TYPES, RESOURCE_TYPES } = require('../constants/notification')

const fan = async (userIds, opts) => {
  const unique = [...new Set(userIds.filter(id => id && id !== opts.actorId))]
  await Promise.all(
    unique.map(userId =>
      notificationService.create({ ...opts, user_id: userId })
        .catch(err => console.error('[NotificationListener]', err.message))
    )
  )
}

const getWatcherIds = async (issueId) => {
  const watchers = await IssueWatcher.findAll({ where: { issue_id: issueId } })
  return watchers.map(w => w.user_id)
}

const register = () => {
  // New assignment → notify assignee
  eventBus.on(ISSUE_EVENTS.UPDATED, async ({ before, issue, actorId }) => {
    if (before.assignee_id !== issue.assignee_id && issue.assignee_id) {
      await fan([issue.assignee_id], {
        actorId,
        event_type:    NOTIFICATION_TYPES.ASSIGNED,
        resource_type: RESOURCE_TYPES.ISSUE,
        resource_id:   issue.id,
        message:       `You were assigned to ${issue.issue_key}: ${issue.title}`
      })
    }
  })

  // Status transition → notify watchers + assignee
  eventBus.on(ISSUE_EVENTS.TRANSITIONED, async ({ issue, from, to, actorId }) => {
    const watcherIds = await getWatcherIds(issue.id)
    const targets    = [...new Set([...watcherIds, issue.assignee_id].filter(Boolean))]
    await fan(targets, {
      actorId,
      event_type:    NOTIFICATION_TYPES.STATUS_CHANGED,
      resource_type: RESOURCE_TYPES.ISSUE,
      resource_id:   issue.id,
      message:       `${issue.issue_key} moved from ${from?.name} to ${to?.name}`,
      metadata:      { from: from?.name, to: to?.name }
    })
  })

  // New comment → notify watchers + @mentioned users
  eventBus.on(COMMENT_EVENTS.CREATED, async ({ comment, issue, actorId, mentions }) => {
    const watcherIds     = await getWatcherIds(issue.id)
    const mentionUserIds = (mentions || []).map(m => m.userId)
    const targets        = [...new Set([...watcherIds, ...mentionUserIds].filter(Boolean))]

    await fan(targets, {
      actorId,
      event_type:    mentionUserIds.length ? NOTIFICATION_TYPES.MENTION : NOTIFICATION_TYPES.COMMENT_ADDED,
      resource_type: RESOURCE_TYPES.COMMENT,
      resource_id:   comment.id,
      message:       mentionUserIds.length
        ? `You were mentioned in a comment on ${issue.issue_key}`
        : `New comment on ${issue.issue_key}`,
      metadata:      { issue_id: issue.id, issue_key: issue.issue_key }
    })
  })
}

module.exports = { register }
