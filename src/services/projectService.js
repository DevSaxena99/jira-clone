const { v4: uuidv4 }   = require('uuid')
const {
  sequelize, Project, ProjectMember, ProjectCounter,
  WorkflowStatus, WorkflowTransition, Issue, User
} = require('../models')
const AppError  = require('../utils/AppError')
const eventBus  = require('../events/eventBus')
const cache     = require('./cacheService')
const { ERROR_CODES }  = require('../constants/errors')
const { ROLES, ADMIN_ROLES } = require('../constants/roles')
const { DEFAULT_WORKFLOW_STATUSES } = require('../constants/issue')

const list = async (userId) => {
  const memberships = await ProjectMember.findAll({ where: { user_id: userId } })
  const ids = memberships.map(m => m.project_id)
  return Project.findAll({
    where: { id: ids },
    include: [{ association: 'owner', attributes: ['id', 'display_name'] }],
    order: [['created_at', 'DESC']]
  })
}

const create = async ({ name, key, description }, ownerId) => {
  const existing = await Project.findOne({ where: { key } })
  if (existing) throw new AppError('Project key already in use', 409, ERROR_CODES.KEY_TAKEN)

  return sequelize.transaction(async (t) => {
    const project = await Project.create(
      { id: uuidv4(), key: key.toUpperCase(), name, description, owner_id: ownerId },
      { transaction: t }
    )

    await ProjectMember.create(
      { project_id: project.id, user_id: ownerId, role: ROLES.OWNER },
      { transaction: t }
    )

    await ProjectCounter.create(
      { project_id: project.id, next_issue_number: 1 },
      { transaction: t }
    )

    const statuses = await WorkflowStatus.bulkCreate(
      DEFAULT_WORKFLOW_STATUSES.map(s => ({ id: uuidv4(), project_id: project.id, ...s })),
      { transaction: t }
    )

    const [todo, inProg, inRev, done] = statuses
    await WorkflowTransition.bulkCreate([
      { id: uuidv4(), project_id: project.id, from_status_id: todo.id,   to_status_id: inProg.id },
      { id: uuidv4(), project_id: project.id, from_status_id: inProg.id, to_status_id: inRev.id  },
      { id: uuidv4(), project_id: project.id, from_status_id: inRev.id,  to_status_id: inProg.id },
      { id: uuidv4(), project_id: project.id, from_status_id: inRev.id,  to_status_id: done.id   },
      { id: uuidv4(), project_id: project.id, from_status_id: null,      to_status_id: todo.id   },
    ], { transaction: t })

    return { project, statuses }
  })
}

const findById = async (projectId, userId) => {
  await _assertMember(projectId, userId)
  return cache.wrap(cache.keys.project(projectId), cache.TTL.PROJECT, () =>
    Project.findByPk(projectId, {
      include: [{ association: 'owner', attributes: ['id', 'display_name', 'email'] }]
    })
  )
}

const update = async (projectId, updates, userId) => {
  await _assertRole(projectId, userId, ADMIN_ROLES)
  const project = await Project.findByPk(projectId)
  if (!project) throw new AppError('Project not found', 404, ERROR_CODES.NOT_FOUND)
  const updated = await project.update(updates)
  await cache.del(cache.keys.project(projectId), cache.keys.board(projectId))
  return updated
}

const getBoard = async (projectId, userId) => {
  await _assertMember(projectId, userId)

  return cache.wrap(cache.keys.board(projectId), cache.TTL.BOARD, async () => {
    const statuses = await WorkflowStatus.findAll({
      where: { project_id: projectId },
      order: [['position', 'ASC']]
    })

    const issues = await Issue.findAll({
      where: { project_id: projectId, status_id: statuses.map(s => s.id) },
      include: [
        { association: 'assignee', attributes: ['id', 'display_name', 'avatar_url'] },
        { association: 'labels' }
      ],
      order: [['created_at', 'ASC']]
    })

    const byStatus = {}
    for (const s of statuses) byStatus[s.id] = []
    for (const i of issues) {
      if (byStatus[i.status_id]) byStatus[i.status_id].push(i)
    }
    return { statuses: statuses.map(s => ({ ...s.toJSON(), issues: byStatus[s.id] })) }
  })
}

const getMembers = async (projectId, userId) => {
  await _assertMember(projectId, userId)
  return ProjectMember.findAll({
    where: { project_id: projectId },
    include: [{ association: 'user', attributes: ['id', 'display_name', 'email', 'avatar_url'] }]
  })
}

const addMember = async (projectId, { user_id, role }, actorId) => {
  await _assertRole(projectId, actorId, ADMIN_ROLES)
  const user = await User.findByPk(user_id)
  if (!user) throw new AppError('User not found', 404, ERROR_CODES.NOT_FOUND)

  const [member] = await ProjectMember.findOrCreate({
    where: { project_id: projectId, user_id },
    defaults: { role: role || ROLES.MEMBER }
  })
  return member
}

const getWorkflow = async (projectId, userId) => {
  await _assertMember(projectId, userId)
  const statuses = await WorkflowStatus.findAll({
    where: { project_id: projectId }, order: [['position', 'ASC']]
  })
  const transitions = await WorkflowTransition.findAll({
    where: { project_id: projectId },
    include: [
      { association: 'fromStatus', attributes: ['id', 'name'] },
      { association: 'toStatus',   attributes: ['id', 'name'] },
      { association: 'actions' },
      { association: 'validations' }
    ]
  })
  return { statuses, transitions }
}

const getActivity = async (projectId, userId, { cursor, limit } = {}) => {
  await _assertMember(projectId, userId)
  const { ActivityLog } = require('../models')
  const { paginate } = require('../utils/pagination')
  return paginate(ActivityLog, {
    where: { project_id: projectId },
    include: [{ association: 'actor', attributes: ['id', 'display_name'] }],
    cursor, limit
  })
}

// ── private ───────────────────────────────────────────────────────────────────

const _assertMember = async (projectId, userId) => {
  const m = await ProjectMember.findOne({ where: { project_id: projectId, user_id: userId } })
  if (!m) throw new AppError('Not a project member', 403, ERROR_CODES.FORBIDDEN)
  return m
}

const _assertRole = async (projectId, userId, roles) => {
  const m = await _assertMember(projectId, userId)
  if (!roles.includes(m.role)) throw new AppError('Insufficient permissions', 403, ERROR_CODES.FORBIDDEN)
  return m
}

const removeMember = async (projectId, userId, actorId) => {
  await _assertRole(projectId, actorId, ADMIN_ROLES)
  const member = await ProjectMember.findOne({ where: { project_id: projectId, user_id: userId } })
  if (!member) throw new AppError('Member not found', 404, ERROR_CODES.NOT_FOUND)
  if (member.role === ROLES.OWNER) throw new AppError('Cannot remove the project owner', 422, ERROR_CODES.INVALID_STATE)
  await member.destroy()
}

module.exports = { list, create, findById, update, getBoard, getMembers, addMember, removeMember, getWorkflow, getActivity }
