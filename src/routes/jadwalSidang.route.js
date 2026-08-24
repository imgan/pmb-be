const router = require('express').Router();
const controller = require('../controllers/jadwalSidang.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createJadwalSidang, updateJadwalSidang } = require('../validations/jadwalSidang.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: JadwalSidang
 *   description: Master jadwal sidang skripsi/tugas akhir per program studi (modul Prodi)
 */

router.get('/', authorize(MENU.PRODI_JADWAL_SIDANG_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.PRODI_JADWAL_SIDANG_MANAGEMENT, ACTION.CREATE),
  validate(createJadwalSidang),
  controller.create
);
router.get('/:id', authorize(MENU.PRODI_JADWAL_SIDANG_MANAGEMENT, ACTION.READ), controller.detail);
router.put(
  '/:id',
  authorize(MENU.PRODI_JADWAL_SIDANG_MANAGEMENT, ACTION.UPDATE),
  validate(updateJadwalSidang),
  controller.update
);
router.delete('/:id', authorize(MENU.PRODI_JADWAL_SIDANG_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
