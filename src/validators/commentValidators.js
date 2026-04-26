const Joi = require('joi')

const create = Joi.object({
  content:   Joi.string().min(1).max(10000).required(),
  parent_id: Joi.string().uuid().optional()
})

const update = Joi.object({
  content: Joi.string().min(1).max(10000).required()
})

module.exports = { create, update }
