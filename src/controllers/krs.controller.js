const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const krsService = require('../services/krs.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await krsService.listKrs(req.query);
  sendResponse(res, 200, { message: 'KRS fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await krsService.getKrsById(req.params.id);
  sendResponse(res, 200, { message: 'KRS fetched', data });
});

const kuota = catchAsync(async (req, res) => {
  const data = await krsService.getKuotaSks(req.query.mahasiswaId, req.query.semester);
  sendResponse(res, 200, { message: 'Kuota SKS fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await krsService.createKrs(req.body, req.user.id);
  sendResponse(res, 201, { message: 'KRS created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await krsService.updateKrs(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'KRS updated', data });
});

const remove = catchAsync(async (req, res) => {
  await krsService.deleteKrs(req.params.id);
  sendResponse(res, 200, { message: 'KRS deleted' });
});

module.exports = { list, detail, kuota, create, update, remove };
