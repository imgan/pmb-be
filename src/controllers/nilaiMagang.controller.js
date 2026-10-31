const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/nilaiMagang.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listNilaiMagang(req.query);
  sendResponse(res, 200, { message: 'Nilai magang fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await service.getNilaiMagangById(req.params.id);
  sendResponse(res, 200, { message: 'Nilai magang fetched', data });
});

const prefill = catchAsync(async (req, res) => {
  const data = await service.getPrefill(req.params.mahasiswaId);
  sendResponse(res, 200, { message: 'Prefill nilai magang fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await service.createNilaiMagang(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Nilai magang created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await service.updateNilaiMagang(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Nilai magang updated', data });
});

const remove = catchAsync(async (req, res) => {
  await service.deleteNilaiMagang(req.params.id);
  sendResponse(res, 200, { message: 'Nilai magang deleted' });
});

module.exports = { list, detail, prefill, create, update, remove };
