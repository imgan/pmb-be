const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/simLaporanUjian.service');

const list = catchAsync(async (req, res) => {
  const { tahun, jenisUjian } = req.query;
  const { data, grandTotal } = await service.listLaporanUjian({
    tahun: tahun ? Number(tahun) : undefined,
    jenisUjian: jenisUjian || undefined,
  });
  sendResponse(res, 200, { message: 'Laporan ujian fetched', data, meta: { grandTotal } });
});

module.exports = { list };
