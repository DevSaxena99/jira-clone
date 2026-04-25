const Joi = require('joi')

const register = Joi.object({
  email:        Joi.string().email().required(),
  password:     Joi.string().min(8).required(),
  display_name: Joi.string().min(1).max(255).required()
})

const login = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required()
})

module.exports = { register, login }
