const router = require('express').Router();
const kampusController = require('../controllers/kampus.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateKampus } = require('../validations/kampus.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Kampus
 *   description: Profil kampus (nama, alamat, kontak, sosial media) yang tampil di website publik
 */

/**
 * @swagger
 * /kampus:
 *   get:
 *     summary: Get profil kampus
 *     tags: [Kampus]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Profil kampus
 *   put:
 *     summary: Update profil kampus
 *     tags: [Kampus]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateKampusRequest'
 *     responses:
 *       200:
 *         description: Kampus updated
 */
router.get(
  '/',
  authorize([MENU.KAMPUS_MANAGEMENT, MENU.LAPORAN_IJAZAH_TRANSKRIP_MANAGEMENT], ACTION.READ),
  kampusController.detail
);
router.put('/', authorize(MENU.KAMPUS_MANAGEMENT, ACTION.UPDATE), validate(updateKampus), kampusController.update);

module.exports = router;
