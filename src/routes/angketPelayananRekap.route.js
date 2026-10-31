const router = require('express').Router();
const controller = require('../controllers/angketPelayananRekap.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

// Hasil angket pelayanan mahasiswa (modul Prodi).
router.get('/', authorize(MENU.PRODI_ANGKET_PELAYANAN_MANAGEMENT, ACTION.READ), controller.rekap);

module.exports = router;
