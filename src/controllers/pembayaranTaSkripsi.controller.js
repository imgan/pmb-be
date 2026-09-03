const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/pembayaranTaSkripsi.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listPembayaran(req.query);
  sendResponse(res, 200, { message: 'Pembayaran TA/Skripsi fetched', data, meta });
});

const tarif = catchAsync(async (req, res) => {
  const data = await service.getTarifPendaftaran(req.query.nim, req.query.periode);
  sendResponse(res, 200, { message: 'Tarif pendaftaran TA/Skripsi fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await service.createPembayaran(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pembayaran TA/Skripsi created', data });
});

const remove = catchAsync(async (req, res) => {
  await service.deletePembayaran(req.params.id);
  sendResponse(res, 200, { message: 'Pembayaran TA/Skripsi deleted' });
});

module.exports = { list, tarif, create, remove };
