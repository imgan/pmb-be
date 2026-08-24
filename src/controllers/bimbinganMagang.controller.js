const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const bimbinganMagangService = require('../services/bimbinganMagang.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await bimbinganMagangService.listBimbinganMagang(req.query);
  sendResponse(res, 200, { message: 'Bimbingan magang fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await bimbinganMagangService.getBimbinganMagangById(req.params.id);
  sendResponse(res, 200, { message: 'Bimbingan magang fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await bimbinganMagangService.createBimbinganMagang(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Bimbingan magang created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await bimbinganMagangService.updateBimbinganMagang(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Bimbingan magang updated', data });
});

const remove = catchAsync(async (req, res) => {
  await bimbinganMagangService.deleteBimbinganMagang(req.params.id);
  sendResponse(res, 200, { message: 'Bimbingan magang deleted' });
});

module.exports = { list, detail, create, update, remove };
