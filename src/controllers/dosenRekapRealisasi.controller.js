const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/dosenRekapRealisasi.service');

const list = catchAsync(async (req, res) => {
  const data = await service.listRekapRealisasi(req.dosen.id, req.tahunAjaranId);
  sendResponse(res, 200, { message: 'Rekap realisasi fetched', data, meta: { targetPertemuan: service.TARGET_PERTEMUAN } });
});

module.exports = { list };
