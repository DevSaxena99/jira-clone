const { v4: uuidv4 } = require('uuid')
const { Comment, Issue, User } = require('../models')
const AppError  = require('../utils/AppError')
const eventBus  = require('../events/eventBus')
const { ERROR_CODES }    = require('../constants/errors')
const { COMMENT_EVENTS } = require('../constants/events')

const MENTION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g

const COMMENT_INCLUDE = [
  { association: 'author', attributes: ['id','display_name','avatar_url'] },
  { association: 'replies', include: [{ association: 'author', attributes: ['id','display_name','avatar_url'] }] }
]

const create = async (issueId, { content, parent_id }, authorId) => {
  const issue = await Issue.findByPk(issueId)
  if (!issue) throw new AppError('Issue not found', 404, ERROR_CODES.NOT_FOUND)

  if (parent_id) {
    const parent = await Comment.findByPk(parent_id)
    if (!parent || parent.issue_id !== issueId) throw new AppError('Parent comment not found', 404, ERROR_CODES.NOT_FOUND)
    if (parent.parent_id) throw new AppError('Cannot nest replies more than one level', 422, ERROR_CODES.INVALID_PARENT)
  }

  const mentions = _parseMentions(content)
  const comment  = await Comment.create({
    id: uuidv4(), issue_id: issueId, author_id: authorId,
    content, parent_id: parent_id || null
  })

  const full = await Comment.findByPk(comment.id, { include: COMMENT_INCLUDE })
  eventBus.emit(COMMENT_EVENTS.CREATED, { comment: full, mentions, issueId, projectId: issue.project_id, actorId: authorId, issue })
  return full
}

const list = async (issueId) => {
  const issue = await Issue.findByPk(issueId)
  if (!issue) throw new AppError('Issue not found', 404, ERROR_CODES.NOT_FOUND)
  return Comment.findAll({
    where: { issue_id: issueId, parent_id: null },
    include: COMMENT_INCLUDE,
    order: [['created_at', 'ASC']]
  })
}

const update = async (commentId, { content }, actorId) => {
  const comment = await Comment.findByPk(commentId)
  if (!comment) throw new AppError('Comment not found', 404, ERROR_CODES.NOT_FOUND)
  if (comment.author_id !== actorId) throw new AppError('Cannot edit another user\'s comment', 403, ERROR_CODES.FORBIDDEN)
  const updated = await comment.update({ content })
  eventBus.emit(COMMENT_EVENTS.UPDATED, { comment: updated, actorId })
  return updated
}

const remove = async (commentId, actorId) => {
  const comment = await Comment.findByPk(commentId)
  if (!comment) throw new AppError('Comment not found', 404, ERROR_CODES.NOT_FOUND)
  if (comment.author_id !== actorId) throw new AppError('Cannot delete another user\'s comment', 403, ERROR_CODES.FORBIDDEN)
  const issueId = comment.issue_id
  await comment.destroy()
  eventBus.emit(COMMENT_EVENTS.DELETED, { commentId, issueId, actorId })
}

const _parseMentions = (content) => {
  const mentions = []
  let match
  while ((match = MENTION_RE.exec(content)) !== null) {
    mentions.push({ displayName: match[1], userId: match[2] })
  }
  return mentions
}

module.exports = { create, list, update, remove }
