const eventBus = require('./eventBus')
const {
  ISSUE_EVENTS, COMMENT_EVENTS,
  SPRINT_EVENTS, NOTIFICATION_EVENTS
} = require('../constants/events')

const envelope = (event, resourceId, actorId, data = {}) => ({
  event, resourceId, actorId,
  timestamp: new Date().toISOString(),
  data
})

const register = (io) => {
  if (!io) return

  eventBus.on(ISSUE_EVENTS.CREATED, ({ issue, actorId }) => {
    io.to(`project:${issue.project_id}`).emit(
      'issue_created',
      envelope('issue_created', issue.issue_key, actorId, {
        id: issue.id, issue_key: issue.issue_key,
        type: issue.type, title: issue.title,
        status: issue.status?.name, priority: issue.priority
      })
    )
  })

  eventBus.on(ISSUE_EVENTS.UPDATED, ({ issue, actorId }) => {
    const payload = envelope('issue_updated', issue.issue_key, actorId, {
      id: issue.id, title: issue.title, priority: issue.priority,
      assignee: issue.assignee?.display_name,
      status: issue.status?.name, version: issue.version
    })
    io.to(`project:${issue.project_id}`).emit('issue_updated', payload)
    io.to(`issue:${issue.id}`).emit('issue_updated', payload)
  })

  eventBus.on(ISSUE_EVENTS.TRANSITIONED, ({ issue, from, to, actorId }) => {
    const payload = envelope('issue_updated', issue.issue_key, actorId, {
      id: issue.id, status: to?.name, version: issue.version
    })
    io.to(`project:${issue.project_id}`).emit('issue_updated', payload)
    io.to(`issue:${issue.id}`).emit('issue_updated', payload)
  })

  eventBus.on(ISSUE_EVENTS.MOVED, ({ issue, sprintId, actorId }) => {
    io.to(`project:${issue.project_id}`).emit(
      'issue_moved',
      envelope('issue_moved', issue.issue_key, actorId, { id: issue.id, sprint_id: sprintId })
    )
  })

  eventBus.on(ISSUE_EVENTS.DELETED, ({ issueId, projectId, actorId }) => {
    io.to(`project:${projectId}`).emit(
      'issue_deleted',
      envelope('issue_deleted', issueId, actorId, { id: issueId })
    )
  })

  eventBus.on(COMMENT_EVENTS.CREATED, ({ comment, issue, actorId }) => {
    io.to(`issue:${issue.id}`).emit(
      'comment_added',
      envelope('comment_added', issue.issue_key, actorId, {
        comment_id: comment.id, content: comment.content?.slice(0, 100)
      })
    )
  })

  eventBus.on(COMMENT_EVENTS.UPDATED, ({ comment, actorId }) => {
    io.to(`issue:${comment.issue_id}`).emit(
      'comment_updated',
      envelope('comment_updated', comment.id, actorId, { comment_id: comment.id })
    )
  })

  eventBus.on(COMMENT_EVENTS.DELETED, ({ commentId, issueId, actorId }) => {
    if (issueId) {
      io.to(`issue:${issueId}`).emit(
        'comment_deleted',
        envelope('comment_deleted', commentId, actorId, { comment_id: commentId })
      )
    }
  })

  eventBus.on(SPRINT_EVENTS.STARTED, ({ sprint, actorId }) => {
    io.to(`project:${sprint.project_id}`).emit(
      'sprint_updated',
      envelope('sprint_updated', sprint.id, actorId, { sprint_id: sprint.id, status: 'active' })
    )
  })

  eventBus.on(SPRINT_EVENTS.COMPLETED, ({ sprint, velocity, actorId }) => {
    io.to(`project:${sprint.project_id}`).emit(
      'sprint_updated',
      envelope('sprint_updated', sprint.id, actorId, {
        sprint_id: sprint.id, status: 'completed', velocity
      })
    )
  })

  eventBus.on(NOTIFICATION_EVENTS.CREATED, ({ notification }) => {
    io.to(`user:${notification.user_id}`).emit('notification:new', {
      id:            notification.id,
      event_type:    notification.event_type,
      message:       notification.message,
      resource_type: notification.resource_type,
      resource_id:   notification.resource_id,
      created_at:    notification.created_at
    })
  })
}

module.exports = { register }
