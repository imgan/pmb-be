const router = require('express').Router();
const controller = require('../controllers/pembimbingAkademik.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPembimbingAkademik, updatePembimbingAkademik } = require('../validations/pembimbingAkademik.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: PembimbingAkademik
 *   description: Master pembimbing akademik (modul Prodi) — SK penugasan dosen sebagai pembimbing akademik (PA)
 */

router.get('/', authorize(MENU.PRODI_PEMBIMBING_AKADEMIK_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.PRODI_PEMBIMBING_AKADEMIK_MANAGEMENT, ACTION.CREATE),
  validate(createPembimbingAkademik),
  controller.create
);
router.get('/:id', authorize(MENU.PRODI_PEMBIMBING_AKADEMIK_MANAGEMENT, ACTION.READ), controller.detail);
router.put(
  '/:id',
  authorize(MENU.PRODI_PEMBIMBING_AKADEMIK_MANAGEMENT, ACTION.UPDATE),
  validate(updatePembimbingAkademik),
  controller.update
);
router.delete('/:id', authorize(MENU.PRODI_PEMBIMBING_AKADEMIK_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
