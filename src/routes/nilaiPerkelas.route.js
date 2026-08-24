const router = require('express').Router();
const controller = require('../controllers/nilaiPerkelas.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: NilaiPerkelas
 *   description: Rekap nilai per kelas/jadwal kuliah (read-only, modul Prodi)
 */

router.get('/', authorize(MENU.PRODI_NILAI_PERKELAS_MANAGEMENT, ACTION.READ), controller.list);
router.get('/kelas-options', authorize(MENU.PRODI_NILAI_PERKELAS_MANAGEMENT, ACTION.READ), controller.kelasOptions);
router.get('/:jadwalKuliahId', authorize(MENU.PRODI_NILAI_PERKELAS_MANAGEMENT, ACTION.READ), controller.detail);

module.exports = router;
