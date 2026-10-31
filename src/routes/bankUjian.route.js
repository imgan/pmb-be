const router = require('express').Router();
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/bankUjian.service');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createBankUjian, updateBankUjian } = require('../validations/bankUjian.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

/**
 * @swagger
 * tags:
 *   name: BankUjian
 *   description: LMS → Kuis & Ujian → Bank Ujian (paket soal PG + essay), dipakai tes seleksi PMB
 * /bank-ujian:
 *   get: { summary: List bank ujian (search), tags: [BankUjian], security: [{ bearerAuth: [] }] }
 *   post: { summary: Buat bank ujian + soal, tags: [BankUjian], security: [{ bearerAuth: [] }] }
 * /bank-ujian/opsi:
 *   get: { summary: Pilihan paket soal untuk form Tes Ujian PMB, tags: [BankUjian], security: [{ bearerAuth: [] }] }
 * /bank-ujian/{id}:
 *   get: { summary: Detail bank ujian + soal, tags: [BankUjian], security: [{ bearerAuth: [] }] }
 *   put: { summary: Ubah bank ujian (soal diganti bila dikirim), tags: [BankUjian], security: [{ bearerAuth: [] }] }
 *   delete: { summary: Hapus bank ujian (ditolak bila dipakai tes), tags: [BankUjian], security: [{ bearerAuth: [] }] }
 */
router.use(authenticate);

const M = MENU.LMS_KUIS_MANAGEMENT;
const ok = (status, message, fn) => catchAsync(async (req, res) => sendResponse(res, status, { message, data: await fn(req) }));

router.get('/opsi', authorize([M, MENU.TES_UJIAN_MANAGEMENT], ACTION.READ), ok(200, 'Opsi bank ujian fetched', () => service.opsiBankUjian()));
router.get('/', authorize(M, ACTION.READ), ok(200, 'Bank ujian fetched', (req) => service.listBankUjian(req.query)));
router.post('/', authorize(M, ACTION.CREATE), validate(createBankUjian), ok(201, 'Bank ujian created', (req) => service.createBankUjian(req.body, req.user.id)));
router.get('/:id', authorize(M, ACTION.READ), ok(200, 'Bank ujian fetched', (req) => service.getBankUjian(req.params.id)));
router.put('/:id', authorize(M, ACTION.UPDATE), validate(updateBankUjian), ok(200, 'Bank ujian updated', (req) => service.updateBankUjian(req.params.id, req.body, req.user.id)));
router.delete(
  '/:id',
  authorize(M, ACTION.DELETE),
  ok(200, 'Bank ujian deleted', async (req) => {
    await service.deleteBankUjian(req.params.id);
    return null;
  })
);

module.exports = router;
