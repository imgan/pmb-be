const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/pmbGrafik.service');

const banding = catchAsync(async (req, res) => {
  const tahun = Number(req.query.tahun) || new Date().getFullYear();
  const data = await service.getBanding(tahun);
  sendResponse(res, 200, { message: 'Grafik banding fetched', data });
});

const tahunOptions = catchAsync(async (req, res) => {
  const data = await service.getTahunOptions();
  sendResponse(res, 200, { message: 'Tahun options fetched', data });
});

const penerimaan = catchAsync(async (req, res) => {
  const data = await service.getPenerimaan({ tahunMasuk: Number(req.query.tahunMasuk) || undefined });
  sendResponse(res, 200, { message: 'Grafik penerimaan fetched', data });
});

const tahunMasukOptions = catchAsync(async (req, res) => {
  const data = await service.getTahunMasukOptions();
  sendResponse(res, 200, { message: 'Tahun masuk options fetched', data });
});

const daftarUlang = catchAsync(async (req, res) => {
  const data = await service.getDaftarUlang();
  sendResponse(res, 200, { message: 'Grafik daftar ulang fetched', data });
});

module.exports = { banding, tahunOptions, penerimaan, tahunMasukOptions, daftarUlang };
