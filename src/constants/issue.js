/**
 * Issue-domain constants: types, priorities, status categories, sprint statuses.
 */

const ISSUE_TYPES = {
  EPIC:    'epic',
  STORY:   'story',
  TASK:    'task',
  BUG:     'bug',
  SUBTASK: 'subtask'
}

const PRIORITIES = {
  LOW:      'low',
  MEDIUM:   'medium',
  HIGH:     'high',
  CRITICAL: 'critical'
}

/** workflow_statuses.category values */
const STATUS_CATEGORIES = {
  TODO:        'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW:   'in_review',
  DONE:        'done'
}

/** sprints.status values */
const SPRINT_STATUSES = {
  PLANNED:   'planned',
  ACTIVE:    'active',
  COMPLETED: 'completed'
}

/** Default workflow statuses seeded on project creation */
const DEFAULT_WORKFLOW_STATUSES = [
  { name: 'To Do',       category: STATUS_CATEGORIES.TODO,        position: 0 },
  { name: 'In Progress', category: STATUS_CATEGORIES.IN_PROGRESS,  position: 1 },
  { name: 'In Review',   category: STATUS_CATEGORIES.IN_REVIEW,    position: 2 },
  { name: 'Done',        category: STATUS_CATEGORIES.DONE,         position: 3 }
]

/** Fields that may be mutated via issue update (allowlist) */
const MUTABLE_ISSUE_FIELDS = [
  'title', 'description', 'priority', 'assignee_id', 'reviewer_id',
  'sprint_id', 'parent_id', 'story_points', 'estimate', 'due_date'
]

/** Fields that are diffed for activity logging on update */
const TRACKED_ISSUE_FIELDS = [
  'title', 'description', 'priority', 'assignee_id',
  'reviewer_id', 'sprint_id', 'story_points'
]

/** Fields allowed in set_field workflow action */
const SET_FIELD_ALLOWED = ['priority', 'story_points', 'estimate', 'due_date']

module.exports = {
  ISSUE_TYPES,
  PRIORITIES,
  STATUS_CATEGORIES,
  SPRINT_STATUSES,
  DEFAULT_WORKFLOW_STATUSES,
  MUTABLE_ISSUE_FIELDS,
  TRACKED_ISSUE_FIELDS,
  SET_FIELD_ALLOWED
}
