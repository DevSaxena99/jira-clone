const { v4: uuidv4 } = require('uuid')
const { CustomField, CustomFieldValue, Project, ProjectMember } = require('../models')
const AppError = require('../utils/AppError')
const { ERROR_CODES } = require('../constants/errors')

const FIELD_TYPES = ['text', 'number', 'dropdown', 'date']

// ── Field definitions (project-level) ─────────────────────────────────────────

const listFields = async (projectId, userId) => {
  await _assertMember(projectId, userId)
  return CustomField.findAll({
    where: { project_id: projectId },
    order: [['position', 'ASC']]
  })
}

const createField = async (projectId, body, userId) => {
  await _assertMember(projectId, userId)
  const { name, field_type, options, required, position } = body
  if (!FIELD_TYPES.includes(field_type)) {
    throw new AppError(`field_type must be one of: ${FIELD_TYPES.join(', ')}`, 400, ERROR_CODES.VALIDATION_ERROR)
  }
  return CustomField.create({
    id: uuidv4(), project_id: projectId,
    name, field_type,
    options:  options  ?? null,
    required: required ?? false,
    position: position ?? 0
  })
}

const updateField = async (fieldId, body, userId) => {
  const field = await CustomField.findByPk(fieldId)
  if (!field) throw new AppError('Custom field not found', 404, ERROR_CODES.NOT_FOUND)
  await _assertMember(field.project_id, userId)
  const { name, options, required, position } = body
  const safe = {}
  if (name     !== undefined) safe.name     = name
  if (options  !== undefined) safe.options  = options
  if (required !== undefined) safe.required = required
  if (position !== undefined) safe.position = position
  return field.update(safe)
}

const deleteField = async (fieldId, userId) => {
  const field = await CustomField.findByPk(fieldId)
  if (!field) throw new AppError('Custom field not found', 404, ERROR_CODES.NOT_FOUND)
  await _assertMember(field.project_id, userId)
  await CustomFieldValue.destroy({ where: { custom_field_id: fieldId } })
  await field.destroy()
}

// ── Field values (issue-level) ─────────────────────────────────────────────────

const getValues = async (issueId) => {
  return CustomFieldValue.findAll({
    where: { issue_id: issueId },
    include: [{ association: 'field' }]
  })
}

const setValue = async (issueId, customFieldId, value, userId) => {
  const field = await CustomField.findByPk(customFieldId)
  if (!field) throw new AppError('Custom field not found', 404, ERROR_CODES.NOT_FOUND)
  await _assertMember(field.project_id, userId)

  const [record, created] = await CustomFieldValue.findOrCreate({
    where: { issue_id: issueId, custom_field_id: customFieldId },
    defaults: { id: uuidv4(), issue_id: issueId, custom_field_id: customFieldId, value }
  })
  if (!created) await record.update({ value })
  return record.reload({ include: [{ association: 'field' }] })
}

// ── private ───────────────────────────────────────────────────────────────────

const _assertMember = async (projectId, userId) => {
  const m = await ProjectMember.findOne({ where: { project_id: projectId, user_id: userId } })
  if (!m) throw new AppError('Not a project member', 403, ERROR_CODES.FORBIDDEN)
}

module.exports = { listFields, createField, updateField, deleteField, getValues, setValue }
