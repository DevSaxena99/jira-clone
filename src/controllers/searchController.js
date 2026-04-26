const { search } = require('../services/searchService')
const AppError = require('../utils/AppError')
const { ERROR_CODES } = require('../constants/errors')

const FILTER_PARAMS = ['q', 'projectId', 'project_id', 'status', 'assignee', 'priority', 'type', 'sprintId', 'label', 'cursor']

const searchIssues = async (req, res, next) => {
  try {
    const hasFilter = FILTER_PARAMS.some(p => req.query[p])
    if (!hasFilter) {
      throw new AppError('Provide at least one search parameter (q, priority, type, status, assignee, etc.)', 400, ERROR_CODES.VALIDATION_ERROR)
    }
    const result = await search({ ...req.query, userId: req.user.id })
    res.json(result)
  } catch (e) { next(e) }
}

module.exports = { searchIssues }
