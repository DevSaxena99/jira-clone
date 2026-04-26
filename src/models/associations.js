module.exports = (models) => {
  const {
    User, Project, ProjectMember, ProjectCounter,
    WorkflowStatus, WorkflowTransition, WorkflowAction, WorkflowValidation,
    Sprint, Issue, Label, IssueLabel, CustomField, CustomFieldValue,
    Comment, IssueWatcher, ActivityLog, Notification
  } = models

  // User
  User.hasMany(Project,      { foreignKey: 'owner_id',    as: 'ownedProjects' })
  User.hasMany(Issue,        { foreignKey: 'assignee_id', as: 'assignedIssues' })
  User.hasMany(Issue,        { foreignKey: 'reporter_id', as: 'reportedIssues' })
  User.hasMany(Issue,        { foreignKey: 'reviewer_id', as: 'reviewingIssues' })
  User.hasMany(Comment,      { foreignKey: 'author_id',   as: 'comments' })
  User.hasMany(ActivityLog,  { foreignKey: 'actor_id',    as: 'activities' })
  User.hasMany(Notification, { foreignKey: 'user_id',     as: 'notifications' })
  User.belongsToMany(Project, { through: ProjectMember, foreignKey: 'user_id',  as: 'projects' })
  User.belongsToMany(Issue,   { through: IssueWatcher,  foreignKey: 'user_id',  as: 'watchedIssues' })

  // Project
  Project.belongsTo(User,            { foreignKey: 'owner_id',   as: 'owner' })
  Project.hasOne(ProjectCounter,     { foreignKey: 'project_id', as: 'counter' })
  Project.hasMany(WorkflowStatus,    { foreignKey: 'project_id', as: 'statuses' })
  Project.hasMany(WorkflowTransition,{ foreignKey: 'project_id', as: 'transitions' })
  Project.hasMany(Sprint,            { foreignKey: 'project_id', as: 'sprints' })
  Project.hasMany(Issue,             { foreignKey: 'project_id', as: 'issues' })
  Project.hasMany(Label,             { foreignKey: 'project_id', as: 'labels' })
  Project.hasMany(CustomField,       { foreignKey: 'project_id', as: 'customFields' })
  Project.hasMany(ActivityLog,       { foreignKey: 'project_id', as: 'activities' })
  Project.belongsToMany(User, { through: ProjectMember, foreignKey: 'project_id', as: 'members' })

  // ProjectMember
  ProjectMember.belongsTo(User,    { foreignKey: 'user_id',    as: 'user'    })
  ProjectMember.belongsTo(Project, { foreignKey: 'project_id', as: 'project' })

  // ProjectCounter
  ProjectCounter.belongsTo(Project, { foreignKey: 'project_id' })

  // WorkflowStatus
  WorkflowStatus.belongsTo(Project,          { foreignKey: 'project_id' })
  WorkflowStatus.hasMany(Issue,              { foreignKey: 'status_id',      as: 'issues'    })
  WorkflowStatus.hasMany(WorkflowTransition, { foreignKey: 'from_status_id', as: 'outgoing'  })
  WorkflowStatus.hasMany(WorkflowTransition, { foreignKey: 'to_status_id',   as: 'incoming'  })

  // WorkflowTransition
  WorkflowTransition.belongsTo(Project,        { foreignKey: 'project_id' })
  WorkflowTransition.belongsTo(WorkflowStatus, { foreignKey: 'from_status_id', as: 'fromStatus' })
  WorkflowTransition.belongsTo(WorkflowStatus, { foreignKey: 'to_status_id',   as: 'toStatus'   })
  WorkflowTransition.hasMany(WorkflowAction,     { foreignKey: 'transition_id', as: 'actions'     })
  WorkflowTransition.hasMany(WorkflowValidation, { foreignKey: 'transition_id', as: 'validations' })

  // WorkflowAction / Validation
  WorkflowAction.belongsTo(WorkflowTransition,     { foreignKey: 'transition_id' })
  WorkflowValidation.belongsTo(WorkflowTransition, { foreignKey: 'transition_id' })

  // Sprint
  Sprint.belongsTo(Project, { foreignKey: 'project_id' })
  Sprint.hasMany(Issue,     { foreignKey: 'sprint_id', as: 'issues' })

  // Issue
  Issue.belongsTo(Project,        { foreignKey: 'project_id' })
  Issue.belongsTo(WorkflowStatus, { foreignKey: 'status_id',  as: 'status'   })
  Issue.belongsTo(User,           { foreignKey: 'assignee_id', as: 'assignee' })
  Issue.belongsTo(User,           { foreignKey: 'reviewer_id', as: 'reviewer' })
  Issue.belongsTo(User,           { foreignKey: 'reporter_id', as: 'reporter' })
  Issue.belongsTo(Sprint,         { foreignKey: 'sprint_id',   as: 'sprint'   })
  Issue.belongsTo(Issue,          { foreignKey: 'parent_id',   as: 'parent'   })
  Issue.hasMany(Issue,            { foreignKey: 'parent_id',   as: 'children' })
  Issue.hasMany(Comment,          { foreignKey: 'issue_id',    as: 'comments' })
  Issue.hasMany(CustomFieldValue, { foreignKey: 'issue_id',    as: 'customFieldValues' })
  Issue.hasMany(ActivityLog,      { foreignKey: 'issue_id',    as: 'activities' })
  Issue.belongsToMany(Label, { through: IssueLabel,  foreignKey: 'issue_id', as: 'labels'   })
  Issue.belongsToMany(User,  { through: IssueWatcher, foreignKey: 'issue_id', as: 'watchers' })

  // Label
  Label.belongsTo(Project, { foreignKey: 'project_id' })
  Label.belongsToMany(Issue, { through: IssueLabel, foreignKey: 'label_id', as: 'issues' })

  // CustomField / Value
  CustomField.belongsTo(Project, { foreignKey: 'project_id' })
  CustomField.hasMany(CustomFieldValue, { foreignKey: 'custom_field_id', as: 'values' })
  CustomFieldValue.belongsTo(Issue,        { foreignKey: 'issue_id'        })
  CustomFieldValue.belongsTo(CustomField,  { foreignKey: 'custom_field_id', as: 'field' })

  // Comment (threaded)
  Comment.belongsTo(Issue,    { foreignKey: 'issue_id'  })
  Comment.belongsTo(User,     { foreignKey: 'author_id', as: 'author' })
  Comment.belongsTo(Comment,  { foreignKey: 'parent_id', as: 'parent' })
  Comment.hasMany(Comment,    { foreignKey: 'parent_id', as: 'replies' })

  // IssueWatcher
  IssueWatcher.belongsTo(Issue, { foreignKey: 'issue_id' })
  IssueWatcher.belongsTo(User,  { foreignKey: 'user_id'  })

  // ActivityLog
  ActivityLog.belongsTo(Project, { foreignKey: 'project_id' })
  ActivityLog.belongsTo(Issue,   { foreignKey: 'issue_id'   })
  ActivityLog.belongsTo(User,    { foreignKey: 'actor_id', as: 'actor' })

  // Notification
  Notification.belongsTo(User, { foreignKey: 'user_id',  as: 'recipient' })
  Notification.belongsTo(User, { foreignKey: 'actor_id', as: 'actor'     })
}
