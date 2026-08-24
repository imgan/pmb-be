const router = require('express').Router();
const suratKeteranganController = require('../controllers/suratKeterangan.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createSurat, updateSurat } = require('../validations/suratKeterangan.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: SuratKeterangan
 *   description: Cetak surat keterangan mahasiswa (modul BAAK)
 */

/**
 * @swagger
 * /laporan/cetak-surat:
 *   get:
 *     summary: List surat keterangan (paginated, searchable by NIM/nama)
 *     tags: [SuratKeterangan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of surat keterangan
 *   post:
 *     summary: Create a new surat keterangan
 *     tags: [SuratKeterangan]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Surat keterangan created
 */
const CODES = [MENU.LAPORAN_CETAK_SURAT_MANAGEMENT, MENU.PRODI_LAPORAN_CETAK_SURAT_MANAGEMENT];

router.get('/', authorize(CODES, ACTION.READ), suratKeteranganController.list);
router.post('/', authorize(CODES, ACTION.CREATE), validate(createSurat), suratKeteranganController.create);

/**
 * @swagger
 * /laporan/cetak-surat/{id}:
 *   get:
 *     summary: Get surat keterangan detail
 *     tags: [SuratKeterangan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Surat keterangan detail
 *       404:
 *         description: Surat keterangan not found
 *   put:
 *     summary: Update a surat keterangan
 *     tags: [SuratKeterangan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Surat keterangan updated
 *   delete:
 *     summary: Delete a surat keterangan
 *     tags: [SuratKeterangan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Surat keterangan deleted
 */
router.get('/:id', authorize(CODES, ACTION.READ), suratKeteranganController.detail);
router.put('/:id', authorize(CODES, ACTION.UPDATE), validate(updateSurat), suratKeteranganController.update);
router.delete(
  '/:id',
  authorize(MENU.LAPORAN_CETAK_SURAT_MANAGEMENT, ACTION.DELETE),
  suratKeteranganController.remove
);

/**
 * @swagger
 * /laporan/cetak-surat/{id}/cetak:
 *   get:
 *     summary: Data lengkap (mahasiswa, jurusan, surat) untuk pratinjau sebelum mencetak
 *     tags: [SuratKeterangan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Data cetak
 *       404:
 *         description: Surat keterangan not found
 */
router.get('/:id/cetak', authorize(CODES, ACTION.READ), suratKeteranganController.cetakData);

/**
 * @swagger
 * /laporan/cetak-surat/{id}/pdf:
 *   get:
 *     summary: Cetak surat keterangan sebagai file PDF
 *     tags: [SuratKeterangan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: File PDF
 *       404:
 *         description: Surat keterangan not found
 */
router.get('/:id/pdf', authorize(CODES, ACTION.READ), suratKeteranganController.cetakPdf);

module.exports = router;
