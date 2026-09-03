const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const pembayaranSertifikasiService = require('../services/pembayaranSertifikasi.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await pembayaranSertifikasiService.listPembayaranSertifikasi(req.query);
  sendResponse(res, 200, { message: 'Pembayaran sertifikasi fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await pembayaranSertifikasiService.getPembayaranSertifikasiById(req.params.id);
  sendResponse(res, 200, { message: 'Pembayaran sertifikasi fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await pembayaranSertifikasiService.createPembayaranSertifikasi(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pembayaran sertifikasi created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await pembayaranSertifikasiService.updatePembayaranSertifikasi(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Pembayaran sertifikasi updated', data });
});

const remove = catchAsync(async (req, res) => {
  await pembayaranSertifikasiService.deletePembayaranSertifikasi(req.params.id);
  sendResponse(res, 200, { message: 'Pembayaran sertifikasi deleted' });
});

module.exports = { list, detail, create, update, remove };
