const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/pembayaranKuliah.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listPembayaranKuliah(req.query);
  sendResponse(res, 200, { message: 'Pembayaran kuliah fetched', data, meta });
});

const create = catchAsync(async (req, res) => {
  const data = await service.createPembayaranKuliah(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pembayaran kuliah created', data });
});

const remove = catchAsync(async (req, res) => {
  await service.deletePembayaranKuliah(req.params.id);
  sendResponse(res, 200, { message: 'Pembayaran kuliah deleted' });
});

module.exports = { list, create, remove };
