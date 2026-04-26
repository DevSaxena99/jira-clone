/**
 * Notification and activity log constants.
 */

/** Notification.event_type values */
const NOTIFICATION_TYPES = {
  ASSIGNED:      'assigned',
  STATUS_CHANGED:'status_changed',
  MENTION:       'mention',
  COMMENT_ADDED: 'comment_added'
}

/** Notification.resource_type ENUM values */
const RESOURCE_TYPES = {
  ISSUE:   'issue',
  COMMENT: 'comment',
  SPRINT:  'sprint'
}

/** ActivityLog.event_type values */
const ACTIVITY_TYPES = {
  ISSUE_CREATED:   'issue_created',
  ISSUE_UPDATED:   'issue_updated',
  STATUS_CHANGED:  'status_changed',
  ISSUE_MOVED:     'issue_moved',
  ISSUE_DELETED:   'issue_deleted',
  COMMENT_ADDED:   'comment_added',
  COMMENT_UPDATED: 'comment_updated',
  COMMENT_DELETED: 'comment_deleted',
  SPRINT_STARTED:  'sprint_started',
  SPRINT_COMPLETED:'sprint_completed'
}

module.exports = { NOTIFICATION_TYPES, RESOURCE_TYPES, ACTIVITY_TYPES }
