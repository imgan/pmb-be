const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const dokumenPendaftaranService = require('../services/dokumenPendaftaran.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await dokumenPendaftaranService.listDokumenPendaftaran(req.query);
  sendResponse(res, 200, { message: 'Dokumen pendaftaran fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await dokumenPendaftaranService.getDokumenPendaftaranById(req.params.id);
  sendResponse(res, 200, { message: 'Dokumen pendaftaran fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await dokumenPendaftaranService.createDokumenPendaftaran(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Dokumen pendaftaran created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await dokumenPendaftaranService.updateDokumenPendaftaran(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Dokumen pendaftaran updated', data });
});

const remove = catchAsync(async (req, res) => {
  await dokumenPendaftaranService.deleteDokumenPendaftaran(req.params.id);
  sendResponse(res, 200, { message: 'Dokumen pendaftaran deleted' });
});

module.exports = { list, detail, create, update, remove };
