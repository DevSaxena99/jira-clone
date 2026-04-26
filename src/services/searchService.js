const { QueryTypes, Op } = require('sequelize')
const { sequelize, Issue, WorkflowStatus, Label, ProjectMember, Comment } = require('../models')
const { decodeCursor, encodeCursor } = require('../utils/pagination')

const ISSUE_ATTRS = [
  'id', 'issue_key', 'project_id', 'type', 'title', 'description',
  'priority', 'status_id', 'assignee_id', 'sprint_id', 'story_points',
  'created_at', 'updated_at'
]

const ISSUE_INCLUDE = [
  { association: 'status',   attributes: ['id', 'name', 'category'] },
  { association: 'assignee', attributes: ['id', 'display_name', 'avatar_url'] },
  { association: 'reporter', attributes: ['id', 'display_name'] },
  { association: 'labels' }
]

const search = async ({
  q, projectId, userId, status, assignee, priority, type,
  sprintId, label, cursor, limit = 20
} = {}) => {
  const cap  = Math.min(parseInt(limit) || 20, 100)
  const where = {}

  // Restrict to projects the requesting user is a member of
  if (projectId) {
    where.project_id = projectId
  } else if (userId) {
    const memberships = await ProjectMember.findAll({
      where: { user_id: userId },
      attributes: ['project_id']
    })
    const accessibleIds = memberships.map(m => m.project_id)
    where.project_id = { [Op.in]: accessibleIds }
  }

  if (priority)  where.priority    = priority
  if (type)      where.type        = type
  if (assignee)  where.assignee_id = assignee
  if (sprintId)  where.sprint_id   = sprintId

  // Resolve status name → status_id
  if (status && projectId) {
    const ws = await WorkflowStatus.findOne({
      where: { project_id: projectId, name: { [Op.like]: `%${status}%` } }
    })
    if (ws) where.status_id = ws.id
  }

  // Cursor decoding
  const parsed = cursor ? decodeCursor(cursor) : null

  let rows

  if (q) {
    // Full-text search: use raw SQL for MATCH … AGAINST scoring, then re-hydrate
    // Searches issue title + description AND comment content
    const boolQ = q.trim().split(/\s+/).filter(Boolean).map(w => `+${w}*`).join(' ')
    const { clause, values } = _buildWhereSQL(where)

    // Cursor clause
    const cursorClause = parsed
      ? `AND (i.created_at < :cursorDate OR (i.created_at = :cursorDate AND i.id < :cursorId))`
      : ''
    const cursorValues = parsed
      ? { cursorDate: new Date(parsed.createdAt), cursorId: parsed.id }
      : {}

    const sql = `
      SELECT DISTINCT ${ISSUE_ATTRS.map(a => `i.${a}`).join(', ')},
             GREATEST(
               COALESCE(MATCH(i.title, i.description) AGAINST (:q IN BOOLEAN MODE), 0),
               COALESCE((SELECT MAX(MATCH(c.content) AGAINST (:q IN BOOLEAN MODE))
                         FROM comments c
                         WHERE c.issue_id = i.id), 0)
             ) AS score
      FROM   issues i
      WHERE  i.deleted_at IS NULL
        AND  (
          MATCH(i.title, i.description) AGAINST (:q IN BOOLEAN MODE)
          OR EXISTS (
            SELECT 1 FROM comments c
            WHERE c.issue_id = i.id
              AND MATCH(c.content) AGAINST (:q IN BOOLEAN MODE)
          )
        )
        ${clause}
        ${cursorClause}
      ORDER  BY score DESC, i.created_at DESC, i.id DESC
      LIMIT  :limit
    `
    const rawRows = await sequelize.query(sql, {
      replacements: { q: boolQ, ...values, ...cursorValues, limit: cap + 1 },
      type: QueryTypes.SELECT
    })

    if (rawRows.length === 0) {
      return { data: [], pagination: { nextCursor: null, hasMore: false, limit: cap } }
    }

    // Re-hydrate via Sequelize to get associations
    const ids = rawRows.map(r => r.id)
    const hydrated = await Issue.findAll({
      where: { id: { [Op.in]: ids } },
      include: ISSUE_INCLUDE
    })

    // Restore relevance order from raw SQL result
    const ord = Object.fromEntries(ids.map((id, i) => [id, i]))
    rows = hydrated.sort((a, b) => (ord[a.id] ?? 999) - (ord[b.id] ?? 999))

  } else {
    // Structured-only search via Sequelize ORM
    const cursorWhere = parsed ? {
      [Op.or]: [
        { created_at: { [Op.lt]: new Date(parsed.createdAt) } },
        { created_at: new Date(parsed.createdAt), id: { [Op.lt]: parsed.id } }
      ]
    } : {}

    const include = label
      ? [
          ...ISSUE_INCLUDE.filter(i => i.association !== 'labels'),
          { association: 'labels', where: { name: label }, required: true }
        ]
      : ISSUE_INCLUDE

    rows = await Issue.findAll({
      where: { ...where, ...cursorWhere },
      include,
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit: cap + 1
    })
  }

  const hasMore    = rows.length > cap
  const data       = hasMore ? rows.slice(0, cap) : rows
  const last       = data[data.length - 1]
  const nextCursor = hasMore && last
    ? encodeCursor(last.createdAt ?? last.created_at, last.id)
    : null

  return { data, pagination: { nextCursor, hasMore, limit: cap } }
}

const _buildWhereSQL = (where) => {
  const clauses = []
  const values  = {}
  if (where.project_id) {
    // Plain string (single project) vs Op.in object (user memberships)
    if (typeof where.project_id === 'string') {
      clauses.push('AND i.project_id = :project_id')
      values.project_id = where.project_id
    } else if (where.project_id[Op.in]) {
      const ids = where.project_id[Op.in]
      if (ids.length === 0) {
        clauses.push('AND 1 = 0') // user has no project memberships
      } else {
        const placeholders = ids.map((_, i) => `:pid${i}`).join(', ')
        clauses.push(`AND i.project_id IN (${placeholders})`)
        ids.forEach((id, i) => { values[`pid${i}`] = id })
      }
    }
  }
  if (where.priority)    { clauses.push('AND i.priority    = :priority');    values.priority    = where.priority    }
  if (where.type)        { clauses.push('AND i.type        = :type');        values.type        = where.type        }
  if (where.assignee_id) { clauses.push('AND i.assignee_id = :assignee_id'); values.assignee_id = where.assignee_id }
  if (where.sprint_id)   { clauses.push('AND i.sprint_id   = :sprint_id');   values.sprint_id   = where.sprint_id   }
  if (where.status_id)   { clauses.push('AND i.status_id   = :status_id');   values.status_id   = where.status_id   }
  return { clause: clauses.join('\n'), values }
}

module.exports = { search }
