const router = require('express').Router();
const controller = require('../controllers/biodataMahasiswa.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: BiodataMahasiswa
 *   description: List biodata mahasiswa (modul Prodi) — edit lewat endpoint /mahasiswa/:id/biodata
 */

router.get('/', authorize(MENU.PRODI_BIODATA_MAHASISWA_MANAGEMENT, ACTION.READ), controller.list);

module.exports = router;
