/**
 * Event bus event name constants.
 * All eventBus.emit() and eventBus.on() calls must use these.
 */

const ISSUE_EVENTS = {
  CREATED:     'issue:created',
  UPDATED:     'issue:updated',
  DELETED:     'issue:deleted',
  TRANSITIONED:'issue:transitioned',
  MOVED:       'issue:moved'
}

const COMMENT_EVENTS = {
  CREATED: 'comment:created',
  UPDATED: 'comment:updated',
  DELETED: 'comment:deleted'
}

const SPRINT_EVENTS = {
  STARTED:   'sprint:started',
  COMPLETED: 'sprint:completed'
}

const NOTIFICATION_EVENTS = {
  CREATED: 'notification:created'
}

module.exports = {
  ISSUE_EVENTS,
  COMMENT_EVENTS,
  SPRINT_EVENTS,
  NOTIFICATION_EVENTS
}
