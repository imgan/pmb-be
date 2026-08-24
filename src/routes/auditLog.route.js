const router = require('express').Router();
const auditLogController = require('../controllers/auditLog.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

/**
 * @swagger
 * tags:
 *   name: AuditLog
 *   description: Log aktivitas sistem (audit trail)
 */

router.use(authenticate);

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: List log aktivitas sistem (paginated, filterable)
 *     tags: [AuditLog]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - in: query
 *         name: module
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: actorType
 *         schema: { type: string, enum: [staff, peserta, public] }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: List of audit logs
 */
router.get(
  '/',
  authorize([MENU.AUDIT_LOG_MANAGEMENT, MENU.BAAK_AUDIT_LOG_MANAGEMENT], ACTION.READ),
  auditLogController.list
);

/**
 * @swagger
 * /audit-logs/modules:
 *   get:
 *     summary: List modul unik yang tercatat di audit log (untuk filter dropdown)
 *     tags: [AuditLog]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of module names
 */
router.get(
  '/modules',
  authorize([MENU.AUDIT_LOG_MANAGEMENT, MENU.BAAK_AUDIT_LOG_MANAGEMENT], ACTION.READ),
  auditLogController.modules
);

module.exports = router;
