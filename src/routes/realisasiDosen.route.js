const router = require('express').Router();
const controller = require('../controllers/realisasiDosen.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);
router.use(authorize(MENU.PRODI_REALISASI_DOSEN_MANAGEMENT, ACTION.READ));

router.get('/', controller.list);
router.get('/filter-options', controller.filterOptions);
router.get('/:id', controller.detail);

module.exports = router;
