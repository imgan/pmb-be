const router = require('express').Router();
const controller = require('../controllers/dinasCutiLupaFinger.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createDinasCuti, updateDinasCuti } = require('../validations/dinasCutiLupaFinger.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: DinasCutiLupaFinger
 *   description: Form input data Dinas/Cuti/Lupa Finger karyawan di modul SDI
 */

router.get('/', authorize(MENU.DINAS_CUTI_LUPA_FINGER_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.DINAS_CUTI_LUPA_FINGER_MANAGEMENT, ACTION.CREATE),
  validate(createDinasCuti),
  controller.create
);
router.get('/:id', authorize(MENU.DINAS_CUTI_LUPA_FINGER_MANAGEMENT, ACTION.READ), controller.detail);
router.put(
  '/:id',
  authorize(MENU.DINAS_CUTI_LUPA_FINGER_MANAGEMENT, ACTION.UPDATE),
  validate(updateDinasCuti),
  controller.update
);
router.delete('/:id', authorize(MENU.DINAS_CUTI_LUPA_FINGER_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
