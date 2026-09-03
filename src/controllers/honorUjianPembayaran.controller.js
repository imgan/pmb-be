const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const honorUjianPembayaranService = require('../services/honorUjianPembayaran.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await honorUjianPembayaranService.listDosenForPembayaran(req.query);
  sendResponse(res, 200, { message: 'Dosen honor ujian fetched', data, meta });
});

const create = catchAsync(async (req, res) => {
  const data = await honorUjianPembayaranService.createPembayaran(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pembayaran honor ujian created', data });
});

module.exports = { list, create };
