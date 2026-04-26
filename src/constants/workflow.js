/**
 * Workflow engine constants: action types, validation types, reviewer strategies.
 */

const WORKFLOW_ACTION_TYPES = {
  ASSIGN_REVIEWER: 'assign_reviewer',
  ASSIGN_USER:     'assign_user',
  SET_FIELD:       'set_field',
  NOTIFY_ROLE:     'notify_role'
}

const WORKFLOW_VALIDATION_TYPES = {
  REQUIRED_FIELD:        'required_field',
  ASSIGNEE_REQUIRED:     'assignee_required',
  REVIEWER_REQUIRED:     'reviewer_required',
  CUSTOM_FIELD_REQUIRED: 'custom_field_required'
}

const REVIEWER_STRATEGIES = {
  REPORTER: 'reporter'
}

module.exports = {
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_VALIDATION_TYPES,
  REVIEWER_STRATEGIES
}
