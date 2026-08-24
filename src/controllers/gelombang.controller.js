const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const gelombangService = require('../services/gelombang.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await gelombangService.listGelombang(req.query);
  sendResponse(res, 200, { message: 'Gelombang fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await gelombangService.getGelombangById(req.params.id);
  sendResponse(res, 200, { message: 'Gelombang fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await gelombangService.createGelombang(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Gelombang created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await gelombangService.updateGelombang(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Gelombang updated', data });
});

const remove = catchAsync(async (req, res) => {
  await gelombangService.deleteGelombang(req.params.id);
  sendResponse(res, 200, { message: 'Gelombang deleted' });
});

module.exports = { list, detail, create, update, remove };
