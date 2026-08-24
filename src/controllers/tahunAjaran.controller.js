const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const tahunAjaranService = require('../services/tahunAjaran.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await tahunAjaranService.listTahunAjaran(req.query);
  sendResponse(res, 200, { message: 'Tahun ajaran fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await tahunAjaranService.getTahunAjaranById(req.params.id);
  sendResponse(res, 200, { message: 'Tahun ajaran fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await tahunAjaranService.createTahunAjaran(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Tahun ajaran created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await tahunAjaranService.updateTahunAjaran(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Tahun ajaran updated', data });
});

const remove = catchAsync(async (req, res) => {
  await tahunAjaranService.deleteTahunAjaran(req.params.id, req.user.id);
  sendResponse(res, 200, { message: 'Tahun ajaran deleted' });
});

module.exports = { list, detail, create, update, remove };
