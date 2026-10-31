const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const agamaService = require('../services/agama.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await agamaService.listAgama(req.query);
  sendResponse(res, 200, { message: 'Agama fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await agamaService.getAgamaById(req.params.id);
  sendResponse(res, 200, { message: 'Agama fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await agamaService.createAgama(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Agama created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await agamaService.updateAgama(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Agama updated', data });
});

const remove = catchAsync(async (req, res) => {
  await agamaService.deleteAgama(req.params.id, req.user.id);
  sendResponse(res, 200, { message: 'Agama deleted' });
});

module.exports = { list, detail, create, update, remove };
