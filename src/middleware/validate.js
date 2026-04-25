const AppError = require('../utils/AppError')

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(
    { ...req.body, ...req.params, ...req.query },
    { abortEarly: false, allowUnknown: true }
  )
  if (error) {
    const msg = error.details.map((d) => d.message).join('; ')
    return next(new AppError(msg, 400, 'VALIDATION_ERROR'))
  }
  req.validated = value
  next()
}

module.exports = validate
