const errorHandler = (err, req, res, next) => {
  const status  = err.status || err.statusCode || 500
  const message = err.message || 'Internal Server Error'
  const code    = err.code || 'INTERNAL_ERROR'
  const data    = err.data || {}

  if (process.env.NODE_ENV === 'development') console.error(err.stack)

  res.status(status).json({ error: code, message, ...data })
}

module.exports = errorHandler
