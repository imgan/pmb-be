const router = require('express').Router();
const { fn, col } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const { Mahasiswa, Dosen, Yudisium } = require('../models');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

/**
 * Ringkasan Beranda Prodi Console: mahasiswa aktif/cuti, dosen homebase, lulusan (yudisium) &
 * sebaran dosen per kelompok — dibatasi ke prodi sesi lewat `req.query.jurusanId` (prodiScope).
 * Endpoint sendiri karena endpoint master (/mahasiswa, /dosen) butuh izin menu BAAK/SDI dan tidak
 * dibatasi per prodi.
 */
router.use(authenticate);

/**
 * @swagger
 * /prodi/dashboard:
 *   get:
 *     summary: Ringkasan Beranda Prodi (dibatasi ke prodi sesi / X-Kode-Prodi)
 *     tags: [Prodi]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/',
  authorize(MENU.PRODI_DASHBOARD, ACTION.READ),
  catchAsync(async (req, res) => {
    const jurusanId = req.query.jurusanId ? [].concat(req.query.jurusanId).map(Number) : null;
    const byProdi = jurusanId ? { jurusanId } : {};
    const [mahasiswaAktif, mahasiswaCuti, totalDosen, mahasiswaLulus, dosenStats] = await Promise.all([
      Mahasiswa.count({ where: { ...byProdi, isActive: true, statusKeluar: null } }),
      Mahasiswa.count({ where: { ...byProdi, statusKeluar: 'CUTI' } }),
      Dosen.count({ where: { ...byProdi, isActive: true } }),
      Yudisium.count({
        include: [{ model: Mahasiswa, as: 'mahasiswa', attributes: [], required: true, where: byProdi }],
      }),
      Dosen.findAll({
        where: { ...byProdi, isActive: true },
        attributes: ['kelompokFakultas', [fn('COUNT', col('id')), 'total']],
        group: ['kelompokFakultas'],
        raw: true,
      }),
    ]);
    sendResponse(res, 200, {
      message: 'Ringkasan dashboard prodi fetched',
      data: {
        mahasiswaAktif,
        mahasiswaCuti,
        totalDosen,
        mahasiswaLulus,
        dosenStats: dosenStats.map((r) => ({ kelompokFakultas: r.kelompokFakultas, total: Number(r.total) })),
      },
    });
  })
);

module.exports = router;
