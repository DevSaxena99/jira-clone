class AppError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST', data = {}) {
    super(message)
    this.status = status
    this.code   = code
    this.data   = data
  }
}

module.exports = AppError
