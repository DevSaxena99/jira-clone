const express = require('express')
const ctrl    = require('../controllers/commentController')
const { authenticate } = require('../middleware/auth')
const { validate }     = require('../middleware/validate')
const v                = require('../validators/commentValidators')

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Threaded comments on issues
 */

/**
 * @swagger
 * /api/issues/{issueId}/comments:
 *   get:
 *     summary: List comments on an issue
 *     description: Returns top-level comments only, each with their `replies` array nested inline.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: issueId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of comments with replies and author info
 *       404:
 *         description: Issue not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Add a comment to an issue
 *     description: |
 *       Supports threaded replies via `parent_id`. Replies cannot be nested more than one level.
 *       Supports `@[DisplayName](userId)` mention syntax — mentioned users receive a `mention` notification.
 *       Emits `comment:created` event → activity log, watcher notifications, and WebSocket `comment_added` broadcast.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: issueId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 10000
 *                 example: "Looks good, but @[Alice](alice-uuid) should review the edge cases."
 *               parent_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the parent comment (for replies — max 1 level deep)
 *     responses:
 *       201:
 *         description: Comment created with author and empty replies array
 *       422:
 *         description: Cannot nest replies more than one level
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Nested: /issues/:issueId/comments
const nested = express.Router({ mergeParams: true })
nested.use(authenticate)
nested.get('/',    ctrl.list)
nested.post('/',   validate({ body: v.create }), ctrl.create)

/**
 * @swagger
 * /api/comments/{id}:
 *   patch:
 *     summary: Edit a comment
 *     description: Only the original author can edit their comment. Sets `edited_at` timestamp.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, maxLength: 10000 }
 *     responses:
 *       200:
 *         description: Updated comment
 *       403:
 *         description: Cannot edit another user's comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Delete a comment
 *     description: Only the original author can delete their comment. Soft-deletes the record.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 *       403:
 *         description: Cannot delete another user's comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Standalone: /comments/:id
const standalone = express.Router()
standalone.use(authenticate)
standalone.patch('/:id',  validate({ body: v.update }), ctrl.update)
standalone.delete('/:id',                               ctrl.remove)

module.exports = { nested, standalone }
