const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const sumberInformasiService = require('../services/sumberInformasi.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await sumberInformasiService.listSumberInformasi(req.query);
  sendResponse(res, 200, { message: 'Sumber informasi fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await sumberInformasiService.getSumberInformasiById(req.params.id);
  sendResponse(res, 200, { message: 'Sumber informasi fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await sumberInformasiService.createSumberInformasi(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Sumber informasi created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await sumberInformasiService.updateSumberInformasi(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Sumber informasi updated', data });
});

const remove = catchAsync(async (req, res) => {
  await sumberInformasiService.deleteSumberInformasi(req.params.id);
  sendResponse(res, 200, { message: 'Sumber informasi deleted' });
});

module.exports = { list, detail, create, update, remove };
