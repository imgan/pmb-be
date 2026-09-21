const router = require('express').Router();
const controller = require('../controllers/evaluasiStudi.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: EvaluasiStudi
 *   description: Evaluasi studi bertahap mahasiswa sesuai Pedoman Akademik (modul Prodi) — hanya menandai, tidak mengubah status apa pun
 */

router.get('/', authorize(MENU.PRODI_EVALUASI_STUDI_MANAGEMENT, ACTION.READ), controller.list);

module.exports = router;
