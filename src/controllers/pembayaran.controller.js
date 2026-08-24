const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const pembayaranService = require('../services/pembayaran.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await pembayaranService.listPembayaran(req.query);
  sendResponse(res, 200, { message: 'Pembayaran fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await pembayaranService.getPembayaranById(req.params.id);
  sendResponse(res, 200, { message: 'Pembayaran fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await pembayaranService.createPembayaran(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pembayaran created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await pembayaranService.updatePembayaran(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Pembayaran updated', data });
});

const remove = catchAsync(async (req, res) => {
  await pembayaranService.deletePembayaran(req.params.id);
  sendResponse(res, 200, { message: 'Pembayaran deleted' });
});

module.exports = { list, detail, create, update, remove };
