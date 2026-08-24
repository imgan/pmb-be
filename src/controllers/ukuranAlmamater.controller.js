const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const ukuranAlmamaterService = require('../services/ukuranAlmamater.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await ukuranAlmamaterService.listUkuranAlmamater(req.query);
  sendResponse(res, 200, { message: 'Ukuran almamater fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await ukuranAlmamaterService.getUkuranAlmamaterById(req.params.id);
  sendResponse(res, 200, { message: 'Ukuran almamater fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await ukuranAlmamaterService.createUkuranAlmamater(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Ukuran almamater created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await ukuranAlmamaterService.updateUkuranAlmamater(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Ukuran almamater updated', data });
});

const remove = catchAsync(async (req, res) => {
  await ukuranAlmamaterService.deleteUkuranAlmamater(req.params.id);
  sendResponse(res, 200, { message: 'Ukuran almamater deleted' });
});

module.exports = { list, detail, create, update, remove };
