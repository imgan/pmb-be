const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const dokumenKelengkapanService = require('../services/dokumenKelengkapan.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await dokumenKelengkapanService.listDokumenKelengkapan(req.query);
  sendResponse(res, 200, { message: 'Dokumen kelengkapan fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await dokumenKelengkapanService.getDokumenKelengkapanById(req.params.id);
  sendResponse(res, 200, { message: 'Dokumen kelengkapan fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await dokumenKelengkapanService.createDokumenKelengkapan(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Dokumen kelengkapan created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await dokumenKelengkapanService.updateDokumenKelengkapan(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Dokumen kelengkapan updated', data });
});

const remove = catchAsync(async (req, res) => {
  await dokumenKelengkapanService.deleteDokumenKelengkapan(req.params.id);
  sendResponse(res, 200, { message: 'Dokumen kelengkapan deleted' });
});

module.exports = { list, detail, create, update, remove };
