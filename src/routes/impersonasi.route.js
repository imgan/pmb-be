const router = require('express').Router();
const controller = require('../controllers/impersonasi.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * /impersonasi/{tipe}:
 *   get:
 *     summary: Daftar akun yang bisa di-impersonasi (staff | dosen | mahasiswa)
 *     tags: [Impersonasi]
 *     parameters:
 *       - in: path
 *         name: tipe
 *         required: true
 *         schema: { type: string, enum: [staff, dosen, mahasiswa] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 * /impersonasi/{tipe}/{id}:
 *   post:
 *     summary: Masuk sebagai akun tsb — mengembalikan token akun (tercatat di audit log)
 *     tags: [Impersonasi]
 */
const TIPE = ':tipe(staff|dosen|mahasiswa)';
router.get(`/${TIPE}`, authorize(MENU.IMPERSONASI_MANAGEMENT, ACTION.READ), controller.list);
router.post(`/${TIPE}/:id(\\d+)`, authorize(MENU.IMPERSONASI_MANAGEMENT, ACTION.CREATE), controller.impersonate);

module.exports = router;
