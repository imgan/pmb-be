const router = require('express').Router();
const controller = require('../controllers/keringanan.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createKeringanan, updateKeringanan } = require('../validations/keringanan.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Keringanan
 *   description: Master keringanan biaya kuliah mahasiswa (modul Keuangan)
 */

router.get('/', authorize(MENU.KEUANGAN_KERINGANAN_MANAGEMENT, ACTION.READ), controller.list);
router.post('/', authorize(MENU.KEUANGAN_KERINGANAN_MANAGEMENT, ACTION.CREATE), validate(createKeringanan), controller.create);
router.get('/:id', authorize(MENU.KEUANGAN_KERINGANAN_MANAGEMENT, ACTION.READ), controller.detail);
router.put('/:id', authorize(MENU.KEUANGAN_KERINGANAN_MANAGEMENT, ACTION.UPDATE), validate(updateKeringanan), controller.update);
router.delete('/:id', authorize(MENU.KEUANGAN_KERINGANAN_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
