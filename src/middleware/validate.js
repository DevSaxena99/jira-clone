const AppError = require('../utils/AppError')
const { ERROR_CODES } = require('../constants/errors')

/**
 * validate({ body: joiSchema, params: joiSchema, query: joiSchema })
 * Also accepts a bare Joi schema for backward-compat (validates req.body).
 */
const validate = (schemas) => (req, res, next) => {
  // Backward compat: bare schema = validate body
  if (typeof schemas?.validate === 'function') {
    schemas = { body: schemas }
  }

  const errors = []

  if (schemas.body) {
    const { error, value } = schemas.body.validate(req.body, { abortEarly: false, allowUnknown: false })
    if (error) errors.push(...error.details.map(d => d.message))
    else { req.body = value; req.validated = value }
  }

  if (schemas.params) {
    const { error, value } = schemas.params.validate(req.params, { abortEarly: false, allowUnknown: true })
    if (error) errors.push(...error.details.map(d => d.message))
    else req.params = value
  }

  if (schemas.query) {
    const { error, value } = schemas.query.validate(req.query, { abortEarly: false, allowUnknown: true })
    if (error) errors.push(...error.details.map(d => d.message))
    else req.query = value
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join('; '), 400, ERROR_CODES.VALIDATION_ERROR))
  }

  next()
}

module.exports = { validate }
