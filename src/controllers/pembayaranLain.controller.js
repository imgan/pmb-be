const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/pembayaranLain.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listPembayaran(req.query);
  sendResponse(res, 200, { message: 'Pembayaran biaya lain fetched', data, meta });
});

const ringkasan = catchAsync(async (req, res) => {
  const data = await service.getRingkasanBiayaLainByNim(req.query.nim);
  sendResponse(res, 200, { message: 'Ringkasan biaya lain fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await service.createPembayaran(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pembayaran biaya lain created', data });
});

const remove = catchAsync(async (req, res) => {
  await service.deletePembayaran(req.params.id);
  sendResponse(res, 200, { message: 'Pembayaran biaya lain deleted' });
});

module.exports = { list, ringkasan, create, remove };
