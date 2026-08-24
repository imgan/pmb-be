const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const pembimbingMagangService = require('../services/pembimbingMagang.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await pembimbingMagangService.listPembimbingMagang(req.query);
  sendResponse(res, 200, { message: 'Pembimbing magang fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await pembimbingMagangService.getPembimbingMagangById(req.params.id);
  sendResponse(res, 200, { message: 'Pembimbing magang fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await pembimbingMagangService.createPembimbingMagang(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pembimbing magang created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await pembimbingMagangService.updatePembimbingMagang(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Pembimbing magang updated', data });
});

const remove = catchAsync(async (req, res) => {
  await pembimbingMagangService.deletePembimbingMagang(req.params.id);
  sendResponse(res, 200, { message: 'Pembimbing magang deleted' });
});

module.exports = { list, detail, create, update, remove };
