const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const calonMahasiswaService = require('../services/calonMahasiswa.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await calonMahasiswaService.listCalonMahasiswa(req.query);
  sendResponse(res, 200, { message: 'Calon mahasiswa fetched', data, meta });
});

const stats = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.getStats(req.query);
  sendResponse(res, 200, { message: 'Stats fetched', data });
});

const detail = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.getCalonMahasiswaById(req.params.id);
  sendResponse(res, 200, { message: 'Calon mahasiswa fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.createCalonMahasiswa(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Calon mahasiswa created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.updateCalonMahasiswa(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Calon mahasiswa updated', data });
});

const remove = catchAsync(async (req, res) => {
  await calonMahasiswaService.deleteCalonMahasiswa(req.params.id);
  sendResponse(res, 200, { message: 'Calon mahasiswa deleted' });
});

const savePendidikan = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.savePendidikan(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Data pendidikan disimpan', data });
});

const saveSumberInformasi = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.saveSumberInformasi(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Sumber informasi disimpan', data });
});

const kunciSumber = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.setKunciSumber(req.params.id, req.body.terkunci, req.user.id);
  sendResponse(res, 200, { message: req.body.terkunci ? 'Data sumber informasi dikunci' : 'Kunci data sumber informasi dibuka', data });
});

const saveDataPmb = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.saveDataPmb(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Data pendaftaran disimpan', data });
});

const kunciDataPmb = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.setKunciDataPmb(req.params.id, req.body.terkunci, req.user.id);
  sendResponse(res, 200, { message: req.body.terkunci ? 'Data pendaftaran dikunci' : 'Kunci data pendaftaran dibuka', data });
});

module.exports = { list, stats, detail, create, update, remove, savePendidikan, saveSumberInformasi, kunciSumber, saveDataPmb, kunciDataPmb };
