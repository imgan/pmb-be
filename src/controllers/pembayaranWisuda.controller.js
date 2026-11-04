const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const pembayaranWisudaService = require('../services/pembayaranWisuda.service');
const { buildKwitansiPembayaranPdf } = require('../services/kwitansiPembayaranPdf.service');
const kampusService = require('../services/kampus.service');

const kwitansiPdf = catchAsync(async (req, res) => {
  const [data, kampus] = await Promise.all([pembayaranWisudaService.getKwitansiWisuda(Number(req.params.id)), kampusService.getKampus()]);
  const doc = buildKwitansiPembayaranPdf(data, kampus);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="kwitansi-wisuda-${data.mahasiswa.nim}-${req.params.id}.pdf"`);
  doc.pipe(res);
});

const listMahasiswa = catchAsync(async (req, res) => {
  const { data, meta } = await pembayaranWisudaService.listMahasiswaWisuda(req.query);
  sendResponse(res, 200, { message: 'Mahasiswa wisuda fetched', data, meta });
});

const generate = catchAsync(async (req, res) => {
  const data = await pembayaranWisudaService.generateTagihanWisuda(req.body, req.user.id);
  sendResponse(res, 200, { message: data.pratinjau ? 'Pratinjau generate' : `${data.baru} tagihan wisuda dibuat, ${data.cicilanDibuat} jadwal cicilan dibuat`, data });
});

const opsiGenerate = catchAsync(async (req, res) => {
  sendResponse(res, 200, { message: 'Opsi generate fetched', data: await pembayaranWisudaService.opsiGenerate() });
});

const opsiTagihan = catchAsync(async (req, res) => {
  sendResponse(res, 200, { message: 'Opsi tagihan fetched', data: await pembayaranWisudaService.opsiTagihanMahasiswa(req.params.mahasiswaId) });
});

const getCicilan = catchAsync(async (req, res) => {
  sendResponse(res, 200, { message: 'Cicilan fetched', data: await pembayaranWisudaService.getCicilanWisuda(req.params.tagihanId) });
});

const saveCicilan = catchAsync(async (req, res) => {
  sendResponse(res, 200, { message: 'Cicilan disimpan', data: await pembayaranWisudaService.saveCicilanWisuda(req.params.tagihanId, req.body.cicilan, req.user.id) });
});

const list = catchAsync(async (req, res) => {
  const { data, meta } = await pembayaranWisudaService.listPembayaranWisuda(req.query);
  sendResponse(res, 200, { message: 'Pembayaran wisuda fetched', data, meta });
});

const create = catchAsync(async (req, res) => {
  const data = await pembayaranWisudaService.createPembayaranWisuda(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pembayaran wisuda created', data });
});

const remove = catchAsync(async (req, res) => {
  await pembayaranWisudaService.deletePembayaranWisuda(req.params.id);
  sendResponse(res, 200, { message: 'Pembayaran wisuda deleted' });
});

module.exports = { kwitansiPdf, getCicilan, saveCicilan, generate, opsiGenerate, opsiTagihan, listMahasiswa, list, create, remove };
