const Joi = require('joi')

const create = Joi.object({
  name:       Joi.string().min(1).max(255).required(),
  goal:       Joi.string().max(2000).optional(),
  start_date: Joi.date().iso().optional(),
  end_date:   Joi.date().iso().greater(Joi.ref('start_date')).optional()
})

const update = Joi.object({
  name:       Joi.string().min(1).max(255),
  goal:       Joi.string().max(2000),
  start_date: Joi.date().iso(),
  end_date:   Joi.date().iso()
}).min(1)

const complete = Joi.object({
  carryOverIssueIds: Joi.array().items(Joi.string().uuid()).default([])
})

module.exports = { create, update, complete }
