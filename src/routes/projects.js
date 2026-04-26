const router     = require('express').Router()
const ctrl       = require('../controllers/projectController')
const { authenticate } = require('../middleware/auth')
const { validate }     = require('../middleware/validate')
const v                = require('../validators/projectValidators')

// Sprint and comment sub-routes mounted under a project
const { nested: sprintNested }  = require('./sprints')
const { nested: commentNested } = require('./comments')

router.use(authenticate)

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management and board operations
 */

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: List all projects the current user belongs to
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of projects with owner info, ordered newest first
 *   post:
 *     summary: Create a new project
 *     description: Creates a project and automatically seeds 4 workflow statuses (To Do, In Progress, In Review, Done) and their transitions.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, key]
 *             properties:
 *               name:        { type: string, example: My Project }
 *               key:         { type: string, example: MYP, description: "2–10 uppercase alphanumeric chars, unique per instance" }
 *               description: { type: string, example: "Project description" }
 *     responses:
 *       201:
 *         description: Project and default workflow statuses created
 *       409:
 *         description: Project key already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/',                                                       ctrl.list)
router.post('/',                     validate({ body: v.create }),   ctrl.create)

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get a single project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Project details with owner
 *       403:
 *         description: Not a project member
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     summary: Update project name or description
 *     tags: [Projects]
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
 *               name:        { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Updated project
 *       403:
 *         description: Requires admin or owner role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id',                                                    ctrl.getOne)
router.patch('/:id',                 validate({ body: v.update }),   ctrl.update)

/**
 * @swagger
 * /api/projects/{id}/board:
 *   get:
 *     summary: Get Kanban board state
 *     description: Returns all workflow statuses with their issues grouped by status column. Result is Redis-cached.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Board with statuses and issues per column
 */
router.get('/:id/board',                                              ctrl.getBoard)

/**
 * @swagger
 * /api/projects/{id}/members:
 *   get:
 *     summary: List all project members
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of members with role and user info
 *   post:
 *     summary: Add a member to the project
 *     description: Requires admin or owner role. Uses findOrCreate so re-adding is idempotent.
 *     tags: [Projects]
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
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string, format: uuid }
 *               role:    { type: string, enum: [admin, member], default: member }
 *     responses:
 *       201:
 *         description: Member added
 *       403:
 *         description: Not admin or owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /api/projects/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a member from the project
 *     description: Requires admin or owner role. Cannot remove the project owner.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Member removed
 *       403:
 *         description: Not admin/owner
 *       422:
 *         description: Cannot remove project owner
 */
router.get('/:id/members',                                            ctrl.getMembers)
router.post('/:id/members',          validate({ body: v.addMember }), ctrl.addMember)
router.delete('/:id/members/:userId',                                 ctrl.removeMember)

/**
 * @swagger
 * /api/projects/{id}/workflow:
 *   get:
 *     summary: Get workflow statuses and transitions
 *     description: Returns all statuses and the allowed transitions between them (including automation actions and validation rules).
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Statuses and transitions with actions/validations
 */
router.get('/:id/workflow',                                           ctrl.getWorkflow)

/**
 * @swagger
 * /api/projects/{id}/activity:
 *   get:
 *     summary: Paginated project activity feed
 *     description: Returns cursor-paginated audit log entries for the project (issue created/updated/transitioned, comments, sprint events).
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *         description: Cursor from previous page
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Activity log entries with pagination cursor
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
 */
router.get('/:id/activity',                                           ctrl.getActivity)

/**
 * @swagger
 * /api/projects/{id}/custom-fields:
 *   get:
 *     summary: List custom fields defined for a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of custom field definitions ordered by position
 *   post:
 *     summary: Create a custom field for the project
 *     tags: [Projects]
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
 *             required: [name, field_type]
 *             properties:
 *               name:       { type: string, example: "Story Points Override" }
 *               field_type: { type: string, enum: [text, number, dropdown, date] }
 *               options:    { type: array, items: { type: string }, description: "Values for dropdown type" }
 *               required:   { type: boolean, default: false }
 *               position:   { type: integer, default: 0 }
 *     responses:
 *       201:
 *         description: Custom field created
 *
 * /api/projects/{id}/custom-fields/{fieldId}:
 *   patch:
 *     summary: Update a custom field definition
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: fieldId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:     { type: string }
 *               options:  { type: array, items: { type: string } }
 *               required: { type: boolean }
 *               position: { type: integer }
 *     responses:
 *       200:
 *         description: Updated custom field
 *   delete:
 *     summary: Delete a custom field and all its values
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: fieldId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 */
const cfSvc = require('../services/customFieldService')

router.get('/:id/custom-fields', async (req, res, next) => {
  try {
    const fields = await cfSvc.listFields(req.params.id, req.user.id)
    res.json({ data: fields })
  } catch (e) { next(e) }
})

router.post('/:id/custom-fields', async (req, res, next) => {
  try {
    const field = await cfSvc.createField(req.params.id, req.body, req.user.id)
    res.status(201).json({ data: field })
  } catch (e) { next(e) }
})

router.patch('/:id/custom-fields/:fieldId', async (req, res, next) => {
  try {
    const field = await cfSvc.updateField(req.params.fieldId, req.body, req.user.id)
    res.json({ data: field })
  } catch (e) { next(e) }
})

router.delete('/:id/custom-fields/:fieldId', async (req, res, next) => {
  try {
    await cfSvc.deleteField(req.params.fieldId, req.user.id)
    res.status(204).send()
  } catch (e) { next(e) }
})

// Issues nested under project
router.use('/:projectId/issues',     require('./issues'))

// Sprints nested under project: /projects/:projectId/sprints
router.use('/:projectId/sprints',    sprintNested)

/**
 * @swagger
 * /api/projects/{id}/presence:
 *   get:
 *     summary: Get active viewers on the board
 *     description: Returns users currently viewing this project's board (tracked via Redis hashes with 1-hour TTL).
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of active viewers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     viewers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:      { type: string }
 *                           displayName: { type: string }
 *                           joinedAt:    { type: string, format: date-time }
 */
router.get('/:id/presence', async (req, res, next) => {
  try {
    const { getViewers } = require('../websocket/presence')
    const viewers = await getViewers(req.params.id, 'board')
    res.json({ data: { viewers } })
  } catch (e) { next(e) }
})

module.exports = router
