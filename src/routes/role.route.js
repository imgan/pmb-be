const router = require('express').Router();
const roleController = require('../controllers/role.controller');
const permissionController = require('../controllers/permission.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createRole, updateRole } = require('../validations/role.validation');
const { assignPermissions } = require('../validations/permission.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Role master data & menu permission (role akses) management
 */

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: List roles (paginated, searchable)
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of roles
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRoleRequest'
 *     responses:
 *       201:
 *         description: Role created
 */
router.get('/', authorize(MENU.ROLE_MANAGEMENT, ACTION.READ), roleController.list);
router.post('/', authorize(MENU.ROLE_MANAGEMENT, ACTION.CREATE), validate(createRole), roleController.create);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Get role detail
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Role detail
 *   put:
 *     summary: Update a role
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRoleRequest'
 *     responses:
 *       200:
 *         description: Role updated
 *   delete:
 *     summary: Delete a role
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Role deleted
 */
router.get('/:id', authorize(MENU.ROLE_MANAGEMENT, ACTION.READ), roleController.detail);
router.put('/:id', authorize(MENU.ROLE_MANAGEMENT, ACTION.UPDATE), validate(updateRole), roleController.update);
router.delete('/:id', authorize(MENU.ROLE_MANAGEMENT, ACTION.DELETE), roleController.remove);

/**
 * @swagger
 * /roles/{roleId}/permissions:
 *   get:
 *     summary: Get menu permissions (hak akses menu) assigned to a role
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/RoleIdParam'
 *     responses:
 *       200:
 *         description: List of role menu permissions
 *   put:
 *     summary: Assign/update menu permissions (hak akses menu) for a role
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/RoleIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignPermissionsRequest'
 *     responses:
 *       200:
 *         description: Permissions updated
 */
router.get('/:roleId/permissions', authorize(MENU.ROLE_MANAGEMENT, ACTION.READ), permissionController.getByRole);
router.put(
  '/:roleId/permissions',
  authorize(MENU.ROLE_MANAGEMENT, ACTION.UPDATE),
  validate(assignPermissions),
  permissionController.assign
);

module.exports = router;
