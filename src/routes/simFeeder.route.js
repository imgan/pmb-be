const router = require('express').Router();
const controller = require('../controllers/simFeeder.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const ACTION = require('../constants/actions');
const feeder = require('../services/feeder');

router.use(authenticate);

// Hak akses per entitas mengikuti menu Feeder-nya masing-masing (mis. SIM_FEEDER_AKM_MANAGEMENT).
const authorizeEntity = (action) => (req, res, next) => {
  let entity;
  try {
    entity = feeder.getEntity(req.params.entity);
  } catch (err) {
    return next(err);
  }
  return authorize(entity.menuCode, action)(req, res, next);
};

/**
 * @swagger
 * tags:
 *   name: SimFeeder
 *   description: Data Feeder PDDIKTI (modul SIM) — list format Neo Feeder, export Excel, CRUD untuk tabel Feeder sendiri
 */

/**
 * @swagger
 * /sim/feeder/lookup/{type}:
 *   get:
 *     summary: Cari opsi relasi (mahasiswa | mataKuliah) untuk form Feeder
 *     tags: [SimFeeder]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Opsi { value, label }
 */
router.get('/lookup/:type', authorize(feeder.allMenuCodes(), ACTION.READ), controller.lookup);

/**
 * @swagger
 * /sim/feeder/{entity}/meta:
 *   get:
 *     summary: Definisi menu Feeder (kolom, field form, aksi)
 *     tags: [SimFeeder]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Meta entitas
 * /sim/feeder/{entity}:
 *   get:
 *     summary: List data Feeder (search, page, limit)
 *     tags: [SimFeeder]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List data
 *   post:
 *     summary: Tambah data (hanya entitas dengan tabel Feeder sendiri)
 *     tags: [SimFeeder]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Data ditambahkan
 * /sim/feeder/{entity}/export:
 *   get:
 *     summary: Export Excel format Neo Feeder
 *     tags: [SimFeeder]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: File xlsx
 * /sim/feeder/{entity}/actions/{action}:
 *   post:
 *     summary: Jalankan aksi massal (mis. generate AKM dari nilai)
 *     tags: [SimFeeder]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Hasil aksi
 * /sim/feeder/{entity}/{id}:
 *   get:
 *     summary: Detail data untuk form edit
 *     tags: [SimFeeder]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Data
 *   put:
 *     summary: Ubah data
 *     tags: [SimFeeder]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Data diperbarui
 *   delete:
 *     summary: Hapus data
 *     tags: [SimFeeder]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Data dihapus
 */
router.get('/:entity/meta', authorizeEntity(ACTION.READ), controller.meta);
router.get('/:entity/export', authorizeEntity(ACTION.READ), controller.exportExcel);
router.post('/:entity/actions/:action', authorizeEntity(ACTION.CREATE), controller.runAction);
router.get('/:entity', authorizeEntity(ACTION.READ), controller.list);
router.post('/:entity', authorizeEntity(ACTION.CREATE), controller.create);
router.get('/:entity/:id', authorizeEntity(ACTION.READ), controller.getRecord);
router.put('/:entity/:id', authorizeEntity(ACTION.UPDATE), controller.update);
router.delete('/:entity/:id', authorizeEntity(ACTION.DELETE), controller.remove);

module.exports = router;
