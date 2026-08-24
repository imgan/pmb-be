const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const beasiswaService = require('../services/beasiswa.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await beasiswaService.listBeasiswa(req.query);
  sendResponse(res, 200, { message: 'Beasiswa fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await beasiswaService.getBeasiswaById(req.params.id);
  sendResponse(res, 200, { message: 'Beasiswa fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await beasiswaService.createBeasiswa(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Beasiswa created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await beasiswaService.updateBeasiswa(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Beasiswa updated', data });
});

const remove = catchAsync(async (req, res) => {
  await beasiswaService.deleteBeasiswa(req.params.id);
  sendResponse(res, 200, { message: 'Beasiswa deleted' });
});

module.exports = { list, detail, create, update, remove };
