const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const tesUjianService = require('../services/tesUjian.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await tesUjianService.listTesUjian(req.query);
  sendResponse(res, 200, { message: 'Tes ujian fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await tesUjianService.getTesUjianById(req.params.id);
  sendResponse(res, 200, { message: 'Tes ujian fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await tesUjianService.createTesUjian(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Tes ujian created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await tesUjianService.updateTesUjian(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Tes ujian updated', data });
});

const remove = catchAsync(async (req, res) => {
  await tesUjianService.deleteTesUjian(req.params.id);
  sendResponse(res, 200, { message: 'Tes ujian deleted' });
});

const listPeserta = catchAsync(async (req, res) => {
  const data = await tesUjianService.listPesertaUjian(req.params.id, req.query);
  sendResponse(res, 200, { message: 'Peserta ujian fetched', data });
});

const listKandidat = catchAsync(async (req, res) => {
  const data = await tesUjianService.listKandidat(req.params.id, req.query);
  sendResponse(res, 200, { message: 'Kandidat peserta ujian fetched', data });
});

const tambahPeserta = catchAsync(async (req, res) => {
  const data = await tesUjianService.tambahPeserta(req.params.id, req.body.pesertaIds, req.user.id);
  sendResponse(res, 201, { message: 'Peserta ujian added', data });
});

const setNilai = catchAsync(async (req, res) => {
  const data = await tesUjianService.setNilai(req.params.id, req.params.pesertaUjianId, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Nilai saved', data });
});

const batalkanPeserta = catchAsync(async (req, res) => {
  await tesUjianService.batalkanPeserta(req.params.id, req.params.pesertaUjianId);
  sendResponse(res, 200, { message: 'Peserta ujian removed' });
});

const getKoreksi = catchAsync(async (req, res) => {
  const data = await tesUjianService.getKoreksi(req.params.id, req.params.pesertaUjianId);
  sendResponse(res, 200, { message: 'Jawaban peserta fetched', data });
});

const simpanKoreksi = catchAsync(async (req, res) => {
  const data = await tesUjianService.simpanKoreksi(req.params.id, req.params.pesertaUjianId, req.body.skor, req.user.id);
  sendResponse(res, 200, { message: 'Koreksi disimpan', data });
});

module.exports = { list, detail, create, update, remove, listPeserta, listKandidat, tambahPeserta, setNilai, batalkanPeserta, getKoreksi, simpanKoreksi };
