const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/pembayaranKuliah.service');
const { getKwitansiData } = require('../services/mahasiswaPembayaran.service');
const { buildKwitansiPembayaranPdf } = require('../services/kwitansiPembayaranPdf.service');
const kampusService = require('../services/kampus.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listPembayaranKuliah(req.query);
  sendResponse(res, 200, { message: 'Pembayaran kuliah fetched', data, meta });
});

const create = catchAsync(async (req, res) => {
  const data = await service.createPembayaranKuliah(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pembayaran kuliah created', data });
});

const remove = catchAsync(async (req, res) => {
  await service.deletePembayaranKuliah(req.params.id);
  sendResponse(res, 200, { message: 'Pembayaran kuliah deleted' });
});

// Kwitansi satu pembayaran (format sama dengan yang dicetak mahasiswa di portal).
const kwitansiPdf = catchAsync(async (req, res) => {
  const [data, kampus] = await Promise.all([getKwitansiData(null, Number(req.params.id)), kampusService.getKampus()]);
  const doc = buildKwitansiPembayaranPdf(data, kampus);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="kwitansi-${data.mahasiswa.nim}-${req.params.id}.pdf"`);
  doc.pipe(res);
});

module.exports = { list, create, remove, kwitansiPdf };
