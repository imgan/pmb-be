const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const keringananService = require('../services/keringanan.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await keringananService.listKeringanan(req.query);
  sendResponse(res, 200, { message: 'Keringanan fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await keringananService.getKeringananById(req.params.id);
  sendResponse(res, 200, { message: 'Keringanan fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await keringananService.createKeringanan(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Keringanan created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await keringananService.updateKeringanan(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Keringanan updated', data });
});

const remove = catchAsync(async (req, res) => {
  await keringananService.deleteKeringanan(req.params.id);
  sendResponse(res, 200, { message: 'Keringanan deleted' });
});

module.exports = { list, detail, create, update, remove };
