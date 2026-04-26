const router = require('express').Router()
const ctrl   = require('../controllers/notificationController')
const { authenticate } = require('../middleware/auth')

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notifications for the authenticated user
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: List notifications for the authenticated user
 *     description: |
 *       Returns cursor-paginated notifications. Filter to unread only with `?unread_only=true`.
 *       Notifications are generated for: issue assignment, status transitions (for watchers),
 *       and new comments / @mentions.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unread_only
 *         schema: { type: boolean }
 *         description: If true, return only unread notifications
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:            { type: string, format: uuid }
 *                       event_type:    { type: string, enum: [assigned, status_changed, comment_added, mention] }
 *                       message:       { type: string }
 *                       resource_type: { type: string, enum: [issue, comment, sprint] }
 *                       resource_id:   { type: string, format: uuid }
 *                       read:          { type: boolean }
 *                       createdAt:     { type: string, format: date-time }
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get count of unread notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     count: { type: integer, example: 5 }
 */

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: All notifications marked as read
 */

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found or belongs to another user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.use(authenticate)
router.get('/',             ctrl.list)
router.get('/unread-count', ctrl.unreadCount)
router.post('/mark-all-read', ctrl.markAllRead)
router.patch('/:id/read',   ctrl.markRead)

module.exports = router
