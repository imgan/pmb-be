const router = require('express').Router();
const controller = require('../controllers/tagihanKuliah.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { generateTagihan } = require('../validations/tagihanKuliah.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: TagihanKuliah
 *   description: Generate Tagihan (modul Keuangan) — generate & lihat tagihan kuliah mahasiswa per tahun ajaran
 */

router.get('/', authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.READ), controller.list);
router.get('/cari', authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.READ), controller.cariByNim);
router.get('/:id', authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.READ), controller.detail);
router.post(
  '/generate',
  authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.CREATE),
  validate(generateTagihan),
  controller.generate
);

module.exports = router;
