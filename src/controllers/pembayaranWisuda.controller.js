const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const pembayaranWisudaService = require('../services/pembayaranWisuda.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await pembayaranWisudaService.listPembayaranWisuda(req.query);
  sendResponse(res, 200, { message: 'Pembayaran wisuda fetched', data, meta });
});

const create = catchAsync(async (req, res) => {
  const data = await pembayaranWisudaService.createPembayaranWisuda(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pembayaran wisuda created', data });
});

const remove = catchAsync(async (req, res) => {
  await pembayaranWisudaService.deletePembayaranWisuda(req.params.id);
  sendResponse(res, 200, { message: 'Pembayaran wisuda deleted' });
});

module.exports = { list, create, remove };
