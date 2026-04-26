const Joi = require('joi')
const { ISSUE_TYPES, PRIORITIES } = require('../constants/issue')

const _types      = Object.values(ISSUE_TYPES)
const _priorities = Object.values(PRIORITIES)

const create = Joi.object({
  type:         Joi.string().valid(..._types).required(),
  title:        Joi.string().min(1).max(500).required(),
  description:  Joi.string().max(10000).optional(),
  priority:     Joi.string().valid(..._priorities).default(PRIORITIES.MEDIUM),
  assignee_id:  Joi.string().uuid().optional(),
  sprint_id:    Joi.string().uuid().optional(),
  parent_id:    Joi.string().uuid().optional(),
  story_points: Joi.number().integer().min(0).max(100).optional(),
  estimate:     Joi.number().integer().min(0).optional(),
  due_date:     Joi.date().iso().optional(),
  label_ids:    Joi.array().items(Joi.string().uuid()).optional()
})

const update = Joi.object({
  version:      Joi.number().integer().required(),
  title:        Joi.string().min(1).max(500),
  description:  Joi.string().max(10000),
  priority:     Joi.string().valid(..._priorities),
  assignee_id:  Joi.string().uuid().allow(null),
  reviewer_id:  Joi.string().uuid().allow(null),
  sprint_id:    Joi.string().uuid().allow(null),
  parent_id:    Joi.string().uuid().allow(null),
  story_points: Joi.number().integer().min(0).max(100).allow(null),
  estimate:     Joi.number().integer().min(0).allow(null),
  due_date:     Joi.date().iso().allow(null),
  label_ids:    Joi.array().items(Joi.string().uuid())
}).min(2)

const transition = Joi.object({
  to_status_id: Joi.string().uuid().required()
})

module.exports = { create, update, transition }
