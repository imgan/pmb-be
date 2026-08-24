const router = require('express').Router();
const homeImageController = require('../controllers/homeImage.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateHomeImages } = require('../validations/homeImage.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: HomeImage
 *   description: Konfigurasi gambar-gambar yang tampil di halaman Beranda (home) website publik
 */

/**
 * @swagger
 * /home-images:
 *   get:
 *     summary: Get konfigurasi gambar beranda
 *     tags: [HomeImage]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Konfigurasi gambar beranda
 *   put:
 *     summary: Update konfigurasi gambar beranda
 *     tags: [HomeImage]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateHomeImagesRequest'
 *     responses:
 *       200:
 *         description: Home images updated
 */
router.get('/', authorize(MENU.HOME_IMAGE_MANAGEMENT, ACTION.READ), homeImageController.detail);
router.put('/', authorize(MENU.HOME_IMAGE_MANAGEMENT, ACTION.UPDATE), validate(updateHomeImages), homeImageController.update);

module.exports = router;
