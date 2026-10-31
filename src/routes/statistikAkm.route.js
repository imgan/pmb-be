const router = require('express').Router();
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');
const service = require('../services/statistikAkm.service');

router.use(authenticate);

/**
 * @swagger
 * /baak/statistik-akm:
 *   get:
 *     summary: Statistik AKM satu periode per angkatan & per prodi (dashboard BAAK); /export untuk Excel
 *     tags: [StatistikAkm]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: tahunAjaranId, schema: { type: integer }, description: Default tahun ajaran aktif }
 */
router.get(
  '/',
  authorize([MENU.BAAK_DASHBOARD, MENU.PRODI_DASHBOARD], ACTION.READ),
  catchAsync(async (req, res) => {
    const data = await service.getStatistikAkm({ tahunAjaranId: Number(req.query.tahunAjaranId) || undefined, jurusanId: req.query.jurusanId || undefined });
    sendResponse(res, 200, { message: 'Statistik AKM fetched', data });
  })
);

router.get(
  '/export',
  authorize([MENU.BAAK_DASHBOARD, MENU.PRODI_DASHBOARD], ACTION.READ),
  catchAsync(async (req, res) => {
    const { workbook, filename } = await service.exportStatistikAkm({ tahunAjaranId: Number(req.query.tahunAjaranId) || undefined, jurusanId: req.query.jurusanId || undefined });
    await sendWorkbook(res, workbook, filename);
  })
);

module.exports = router;
