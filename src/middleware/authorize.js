const { ProjectMember } = require('../models')
const AppError = require('../utils/AppError')
const { ERROR_CODES } = require('../constants/errors')

const authorize = (projectIdParam = 'id') => async (req, res, next) => {
  try {
    const projectId = req.params[projectIdParam] || req.body.project_id
    if (!projectId) return next()

    const member = await ProjectMember.findOne({
      where: { project_id: projectId, user_id: req.user.id }
    })
    if (!member) throw new AppError('Not a project member', 403, ERROR_CODES.FORBIDDEN)

    req.membership = member
    next()
  } catch (err) { next(err) }
}

module.exports = { authorize }
