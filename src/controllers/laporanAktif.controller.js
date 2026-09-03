const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/laporanAktif.service');

const list = catchAsync(async (req, res) => {
  const { tahun, semester } = req.query;
  const data = await service.listAktif({
    tahun: tahun ? Number(tahun) : undefined,
    semester: semester || undefined,
  });
  sendResponse(res, 200, { message: 'Laporan aktif fetched', data });
});

module.exports = { list };
