const router = require('express').Router();
const menuController = require('../controllers/menu.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createMenu, updateMenu } = require('../validations/menu.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Menus
 *   description: Menu master data management (used for sidebar & RBAC)
 */

/**
 * @swagger
 * /menus/tree:
 *   get:
 *     summary: Get menus as a nested tree (for sidebar rendering). Available to any authenticated staff user; the client filters it by their own role permissions.
 *     tags: [Menus]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Nested menu tree
 */
router.get('/tree', menuController.tree);

/**
 * @swagger
 * /menus:
 *   get:
 *     summary: List menus (paginated, searchable)
 *     tags: [Menus]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of menus
 *   post:
 *     summary: Create a new menu
 *     tags: [Menus]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMenuRequest'
 *     responses:
 *       201:
 *         description: Menu created
 */
router.get('/', authorize(MENU.MENU_MANAGEMENT, ACTION.READ), menuController.list);
router.post('/', authorize(MENU.MENU_MANAGEMENT, ACTION.CREATE), validate(createMenu), menuController.create);

/**
 * @swagger
 * /menus/{id}:
 *   get:
 *     summary: Get menu detail
 *     tags: [Menus]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Menu detail
 *   put:
 *     summary: Update a menu
 *     tags: [Menus]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMenuRequest'
 *     responses:
 *       200:
 *         description: Menu updated
 *   delete:
 *     summary: Delete a menu
 *     tags: [Menus]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Menu deleted
 */
router.get('/:id', authorize(MENU.MENU_MANAGEMENT, ACTION.READ), menuController.detail);
router.put('/:id', authorize(MENU.MENU_MANAGEMENT, ACTION.UPDATE), validate(updateMenu), menuController.update);
router.delete('/:id', authorize(MENU.MENU_MANAGEMENT, ACTION.DELETE), menuController.remove);

module.exports = router;
