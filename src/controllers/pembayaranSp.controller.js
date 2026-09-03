const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/pembayaranSp.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listPembayaran(req.query);
  sendResponse(res, 200, { message: 'Pembayaran SP fetched', data, meta });
});

const tarif = catchAsync(async (req, res) => {
  const data = await service.getTarifSp(req.query.nim);
  sendResponse(res, 200, { message: 'Tarif SP fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await service.createPembayaran(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pembayaran SP created', data });
});

const remove = catchAsync(async (req, res) => {
  await service.deletePembayaran(req.params.id);
  sendResponse(res, 200, { message: 'Pembayaran SP deleted' });
});

module.exports = { list, tarif, create, remove };
