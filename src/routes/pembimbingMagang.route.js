const router = require('express').Router();
const controller = require('../controllers/pembimbingMagang.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPembimbingMagang, updatePembimbingMagang } = require('../validations/pembimbingMagang.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: PembimbingMagang
 *   description: Master data dosen pembimbing magang (modul Prodi)
 */

router.get('/', authorize(MENU.PRODI_PEMBIMBING_MAGANG_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.PRODI_PEMBIMBING_MAGANG_MANAGEMENT, ACTION.CREATE),
  validate(createPembimbingMagang),
  controller.create
);
router.get('/:id', authorize(MENU.PRODI_PEMBIMBING_MAGANG_MANAGEMENT, ACTION.READ), controller.detail);
router.put(
  '/:id',
  authorize(MENU.PRODI_PEMBIMBING_MAGANG_MANAGEMENT, ACTION.UPDATE),
  validate(updatePembimbingMagang),
  controller.update
);
router.delete('/:id', authorize(MENU.PRODI_PEMBIMBING_MAGANG_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
