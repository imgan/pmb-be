const router = require('express').Router();
const controller = require('../controllers/bimbinganMagang.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createBimbinganMagang, updateBimbinganMagang } = require('../validations/bimbinganMagang.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: BimbinganMagang
 *   description: Master data mahasiswa magang beserta pembimbing, judul, nilai, dan kelas (modul Prodi)
 */

router.get('/', authorize(MENU.PRODI_BIMBINGAN_MAGANG_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.PRODI_BIMBINGAN_MAGANG_MANAGEMENT, ACTION.CREATE),
  validate(createBimbinganMagang),
  controller.create
);
router.get('/:id', authorize(MENU.PRODI_BIMBINGAN_MAGANG_MANAGEMENT, ACTION.READ), controller.detail);
router.put(
  '/:id',
  authorize(MENU.PRODI_BIMBINGAN_MAGANG_MANAGEMENT, ACTION.UPDATE),
  validate(updateBimbinganMagang),
  controller.update
);
router.delete('/:id', authorize(MENU.PRODI_BIMBINGAN_MAGANG_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
