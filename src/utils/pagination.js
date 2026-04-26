const { Op } = require('sequelize')

const encodeCursor = (createdAt, id) =>
  Buffer.from(JSON.stringify({ createdAt, id })).toString('base64')

const decodeCursor = (cursor) => {
  try { return JSON.parse(Buffer.from(cursor, 'base64').toString()) }
  catch { return null }
}

const paginate = async (Model, { where = {}, include = [], order, limit = 20, cursor, paranoid = true } = {}) => {
  const cap    = Math.min(parseInt(limit) || 20, 100)
  const parsed = cursor ? decodeCursor(cursor) : null

  const finalWhere = { ...where }
  if (parsed) {
    finalWhere[Op.or] = [
      { created_at: { [Op.lt]: new Date(parsed.createdAt) } },
      { created_at: new Date(parsed.createdAt), id: { [Op.lt]: parsed.id } }
    ]
  }

  const rows = await Model.findAll({
    where: finalWhere,
    include,
    order: order || [['created_at', 'DESC'], ['id', 'DESC']],
    limit: cap + 1,
    paranoid
  })

  const hasMore    = rows.length > cap
  const data       = hasMore ? rows.slice(0, cap) : rows
  const last       = data[data.length - 1]
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt ?? last.created_at, last.id) : null

  return { data, pagination: { nextCursor, hasMore, limit: cap } }
}

module.exports = { paginate, encodeCursor, decodeCursor }
