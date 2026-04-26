const router = require('express').Router()
const { searchIssues } = require('../controllers/searchController')
const { authenticate }  = require('../middleware/auth')

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search issues with full-text and structured filters
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Full-text query (searches title and description)
 *       - in: query
 *         name: projectId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Status name (partial match)
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high, critical] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [epic, story, task, bug, subtask] }
 *       - in: query
 *         name: assignee
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sprintId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: label
 *         schema: { type: string }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticate, searchIssues)

module.exports = router
