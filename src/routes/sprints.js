const express = require('express')
const ctrl    = require('../controllers/sprintController')
const { authenticate } = require('../middleware/auth')
const { validate }     = require('../middleware/validate')
const v                = require('../validators/sprintValidators')

/**
 * @swagger
 * tags:
 *   name: Sprints
 *   description: Sprint planning, start, and completion
 */

/**
 * @swagger
 * /api/projects/{projectId}/sprints:
 *   post:
 *     summary: Create a new sprint
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:       { type: string, example: "Sprint 1" }
 *               goal:       { type: string, example: "Ship auth flow" }
 *               start_date: { type: string, format: date, example: "2026-05-01" }
 *               end_date:   { type: string, format: date, example: "2026-05-15" }
 *     responses:
 *       201:
 *         description: Sprint created with status "planned"
 *   get:
 *     summary: List all sprints in a project
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of sprints ordered by newest first
 */

// Nested router: /projects/:projectId/sprints
const nested = express.Router({ mergeParams: true })
nested.use(authenticate)
nested.post('/',              validate({ body: v.create }),   ctrl.create)
nested.get('/',                                               ctrl.list)

/**
 * @swagger
 * /api/sprints/{id}:
 *   get:
 *     summary: Get a sprint with its issues
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Sprint details with associated issues (including status and assignee)
 *       404:
 *         description: Sprint not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     summary: Update sprint name, goal, or dates
 *     description: Cannot update a completed sprint.
 *     tags: [Sprints]
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
 *             properties:
 *               name:       { type: string }
 *               goal:       { type: string }
 *               start_date: { type: string, format: date }
 *               end_date:   { type: string, format: date }
 *     responses:
 *       200:
 *         description: Updated sprint
 *       422:
 *         description: Cannot update a completed sprint
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/sprints/{id}/start:
 *   post:
 *     summary: Start a sprint
 *     description: |
 *       Transitions sprint status from `planned` → `active`. Guards: sprint must be planned,
 *       and no other sprint in the same project can be active at the same time.
 *       Emits `sprint:started` event → activity log + WebSocket `sprint_updated` broadcast.
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Sprint is now active
 *       422:
 *         description: Sprint is not in planned state, or another sprint is already active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/sprints/{id}/complete:
 *   post:
 *     summary: Complete a sprint
 *     description: |
 *       Closes an active sprint. Issues in `carryOverIssueIds` are returned to the backlog
 *       (`sprint_id = null`). All remaining unfinished issues are automatically moved to the
 *       "Done" status. Emits `sprint:completed` event → activity log + WebSocket broadcast.
 *     tags: [Sprints]
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
 *             properties:
 *               carryOverIssueIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 description: Issue IDs to carry back to backlog instead of closing
 *                 default: []
 *     responses:
 *       200:
 *         description: Sprint completed
 *       422:
 *         description: Sprint is not active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Standalone router: /sprints/:id
const standalone = express.Router()
standalone.use(authenticate)
standalone.get('/:id',          ctrl.getOne)
standalone.patch('/:id',        validate({ body: v.update }), ctrl.update)
standalone.post('/:id/start',                                 ctrl.start)
standalone.post('/:id/complete', validate({ body: v.complete }), ctrl.complete)

module.exports = { nested, standalone }
