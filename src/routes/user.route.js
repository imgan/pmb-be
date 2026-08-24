const router = require('express').Router();
const userController = require('../controllers/user.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createUser, updateUser } = require('../validations/user.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User master data management
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List users (paginated, searchable)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of users
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: User created
 */
router.get('/', authorize(MENU.USER_MANAGEMENT, ACTION.READ), userController.list);
router.post('/', authorize(MENU.USER_MANAGEMENT, ACTION.CREATE), validate(createUser), userController.create);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user detail
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: User detail
 *       404:
 *         description: User not found
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: User updated
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: User deleted
 */
router.get('/:id', authorize(MENU.USER_MANAGEMENT, ACTION.READ), userController.detail);
router.put('/:id', authorize(MENU.USER_MANAGEMENT, ACTION.UPDATE), validate(updateUser), userController.update);
router.delete('/:id', authorize(MENU.USER_MANAGEMENT, ACTION.DELETE), userController.remove);

module.exports = router;
