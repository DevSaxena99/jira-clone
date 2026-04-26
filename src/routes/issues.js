const router = require('express').Router({ mergeParams: true })
const ctrl   = require('../controllers/issueController')
const { authenticate }  = require('../middleware/auth')
const { validate }      = require('../middleware/validate')
const v                 = require('../validators/issueValidators')

// nested: /projects/:projectId/issues AND standalone: /issues
router.use(authenticate)

/**
 * @swagger
 * tags:
 *   name: Issues
 *   description: Issue lifecycle — create, update, transition, delete
 */

/**
 * @swagger
 * /api/projects/{projectId}/issues:
 *   post:
 *     summary: Create a new issue in a project
 *     description: |
 *       Auto-generates a unique issue key (e.g. `MYP-1`). Sets status to the first "To Do" workflow status.
 *       Emits `issue:created` event which triggers activity log, board cache invalidation, and WebSocket broadcast.
 *     tags: [Issues]
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
 *             required: [type, title]
 *             properties:
 *               type:         { type: string, enum: [epic, story, task, bug, subtask] }
 *               title:        { type: string, maxLength: 500 }
 *               description:  { type: string, maxLength: 10000 }
 *               priority:     { type: string, enum: [low, medium, high, critical], default: medium }
 *               assignee_id:  { type: string, format: uuid }
 *               sprint_id:    { type: string, format: uuid }
 *               parent_id:    { type: string, format: uuid, description: Parent issue for subtasks }
 *               story_points: { type: integer, minimum: 0, maximum: 100 }
 *               estimate:     { type: integer, minimum: 0, description: Estimate in minutes }
 *               due_date:     { type: string, format: date }
 *               label_ids:    { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       201:
 *         description: Issue created with full details
 *       403:
 *         description: Not a project member
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/',                          validate({ body: v.create }),     ctrl.create)

/**
 * @swagger
 * /api/issues/{id}:
 *   get:
 *     summary: Get a single issue
 *     description: Returns full issue details including status, assignee, reporter, sprint, labels, and watchers.
 *     tags: [Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Issue details
 *       404:
 *         description: Issue not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     summary: Update issue fields
 *     description: |
 *       **Requires `version` field** (optimistic locking). Pass the current version from GET — if the issue
 *       was modified concurrently, returns `409 CONFLICT` with `currentVersion` so the client can retry.
 *     tags: [Issues]
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
 *             required: [version]
 *             properties:
 *               version:      { type: integer, description: "Current version from GET (required for optimistic locking)" }
 *               title:        { type: string }
 *               description:  { type: string }
 *               priority:     { type: string, enum: [low, medium, high, critical] }
 *               assignee_id:  { type: string, format: uuid, nullable: true }
 *               reviewer_id:  { type: string, format: uuid, nullable: true }
 *               sprint_id:    { type: string, format: uuid, nullable: true }
 *               parent_id:    { type: string, format: uuid, nullable: true }
 *               story_points: { type: integer, nullable: true }
 *               estimate:     { type: integer, nullable: true }
 *               due_date:     { type: string, format: date, nullable: true }
 *               label_ids:    { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Updated issue
 *       409:
 *         description: Concurrent modification — stale version
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:          { type: string, example: CONFLICT }
 *                 message:        { type: string }
 *                 currentVersion: { type: integer }
 *   delete:
 *     summary: Soft-delete an issue
 *     description: Soft-deletes the issue (sets `deleted_at`). The issue is no longer returned by any query.
 *     tags: [Issues]
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
 *       404:
 *         description: Issue not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id',                                                           ctrl.getOne)
router.patch('/:id',                      validate({ body: v.update }),     ctrl.update)
router.delete('/:id',                                                        ctrl.remove)

/**
 * @swagger
 * /api/issues/{id}/transition:
 *   post:
 *     summary: Transition issue to a new status
 *     description: |
 *       Runs the workflow engine: validates the transition exists, runs validation rules
 *       (required fields, assignee, reviewer checks), executes automation actions (assign_reviewer,
 *       assign_user, set_field), then updates status atomically with optimistic locking.
 *     tags: [Issues]
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
 *             required: [to_status_id]
 *             properties:
 *               to_status_id: { type: string, format: uuid, description: "Target status UUID — get allowed values from GET /issues/{id}/transitions" }
 *     responses:
 *       200:
 *         description: Issue with updated status
 *       422:
 *         description: Transition not allowed or validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:              { type: string, example: INVALID_TRANSITION }
 *                 message:            { type: string }
 *                 allowedTransitions: { type: array, items: { type: string } }
 */
router.post('/:id/transition',            validate({ body: v.transition }), ctrl.transition)

/**
 * @swagger
 * /api/issues/{id}/transitions:
 *   get:
 *     summary: List allowed transitions from current status
 *     description: Returns the workflow transitions available from the issue's current status, including `fromStatus` and `toStatus` names.
 *     tags: [Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of allowed transitions
 */
router.get('/:id/transitions',                                               ctrl.getTransitions)

/**
 * @swagger
 * /api/issues/{id}/watchers:
 *   post:
 *     summary: Watch an issue
 *     description: Adds the authenticated user as a watcher. Watchers receive notifications on status transitions and new comments.
 *     tags: [Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Now watching
 *   delete:
 *     summary: Unwatch an issue
 *     tags: [Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: No longer watching
 */
router.post('/:id/watchers',                                                 ctrl.addWatcher)
router.delete('/:id/watchers',                                               ctrl.removeWatcher)

/**
 * @swagger
 * /api/issues/{id}/activity:
 *   get:
 *     summary: Issue-level activity log
 *     description: Cursor-paginated audit entries for this specific issue (created, updated, status changes, comments).
 *     tags: [Issues]
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
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Activity entries with pagination
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
router.get('/:id/activity',                                                  ctrl.getActivity)

/**
 * @swagger
 * /api/issues/{id}/custom-fields:
 *   get:
 *     summary: Get all custom field values for an issue
 *     tags: [Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of custom field values with field metadata
 *
 * /api/issues/{id}/custom-fields/{fieldId}:
 *   put:
 *     summary: Set a custom field value on an issue (upsert)
 *     tags: [Issues]
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
 *             required: [value]
 *             properties:
 *               value: { type: string, description: "Value stored as string for all field types" }
 *     responses:
 *       200:
 *         description: Custom field value upserted
 */
const cfSvc = require('../services/customFieldService')

router.get('/:id/custom-fields', async (req, res, next) => {
  try {
    const values = await cfSvc.getValues(req.params.id)
    res.json({ data: values })
  } catch (e) { next(e) }
})

router.put('/:id/custom-fields/:fieldId', async (req, res, next) => {
  try {
    const record = await cfSvc.setValue(req.params.id, req.params.fieldId, req.body.value, req.user.id)
    res.json({ data: record })
  } catch (e) { next(e) }
})

// Comments nested under issues: /issues/:issueId/comments
const { nested: commentNested } = require('./comments')
router.use('/:issueId/comments', commentNested)

module.exports = router
