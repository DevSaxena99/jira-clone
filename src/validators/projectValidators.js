const Joi = require('joi')
const { ROLES } = require('../constants/roles')

const create = Joi.object({
  name:        Joi.string().min(1).max(255).required(),
  key:         Joi.string().alphanum().min(2).max(10).uppercase().required(),
  description: Joi.string().max(2000).optional()
})

const update = Joi.object({
  name:        Joi.string().min(1).max(255),
  description: Joi.string().max(2000)
}).min(1)

const addMember = Joi.object({
  user_id: Joi.string().uuid().required(),
  role:    Joi.string().valid(ROLES.ADMIN, ROLES.MEMBER).default(ROLES.MEMBER)
})

module.exports = { create, update, addMember }
