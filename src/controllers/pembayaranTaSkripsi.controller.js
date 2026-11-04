const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/pembayaranTaSkripsi.service');
const { buildKwitansiPembayaranPdf } = require('../services/kwitansiPembayaranPdf.service');
const kampusService = require('../services/kampus.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listPembayaran(req.query);
  sendResponse(res, 200, { message: 'Pembayaran TA/Skripsi fetched', data, meta });
});

const listMahasiswa = catchAsync(async (req, res) => {
  const { data, meta } = await service.listMahasiswaTa(req.query);
  sendResponse(res, 200, { message: 'Mahasiswa TA/Skripsi fetched', data, meta });
});

const opsiGenerate = catchAsync(async (req, res) => {
  sendResponse(res, 200, { message: 'Opsi generate fetched', data: await service.opsiGenerate() });
});

const generate = catchAsync(async (req, res) => {
  const data = await service.generateTagihanTa(req.body, req.user.id);
  sendResponse(res, 200, { message: data.pratinjau ? 'Pratinjau generate' : `${data.baru} tagihan TA/Skripsi dibuat, ${data.cicilanDibuat} jadwal cicilan dibuat`, data });
});

const opsiTagihan = catchAsync(async (req, res) => {
  sendResponse(res, 200, { message: 'Opsi tagihan fetched', data: await service.opsiTagihanMahasiswa(req.params.mahasiswaId) });
});

const getCicilan = catchAsync(async (req, res) => {
  sendResponse(res, 200, { message: 'Cicilan fetched', data: await service.getCicilanTa(req.params.tagihanId) });
});

const saveCicilan = catchAsync(async (req, res) => {
  sendResponse(res, 200, { message: 'Cicilan disimpan', data: await service.saveCicilanTa(req.params.tagihanId, req.body.cicilan, req.user.id) });
});

const create = catchAsync(async (req, res) => {
  const data = await service.createPembayaran(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pembayaran TA/Skripsi created', data });
});

const kwitansiPdf = catchAsync(async (req, res) => {
  const [data, kampus] = await Promise.all([service.getKwitansiTa(Number(req.params.id)), kampusService.getKampus()]);
  const doc = buildKwitansiPembayaranPdf(data, kampus);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="kwitansi-ta-${data.mahasiswa.nim}-${req.params.id}.pdf"`);
  doc.pipe(res);
});

const remove = catchAsync(async (req, res) => {
  await service.deletePembayaran(req.params.id);
  sendResponse(res, 200, { message: 'Pembayaran TA/Skripsi deleted' });
});

module.exports = { list, listMahasiswa, opsiGenerate, generate, opsiTagihan, getCicilan, saveCicilan, create, kwitansiPdf, remove };
