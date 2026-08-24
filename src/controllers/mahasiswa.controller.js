const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const mahasiswaService = require('../services/mahasiswa.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await mahasiswaService.listMahasiswa(req.query);
  sendResponse(res, 200, { message: 'Mahasiswa fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await mahasiswaService.getMahasiswaById(req.params.id);
  sendResponse(res, 200, { message: 'Mahasiswa fetched', data });
});

const update = catchAsync(async (req, res) => {
  const data = await mahasiswaService.updateMahasiswa(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Mahasiswa updated', data });
});

const remove = catchAsync(async (req, res) => {
  await mahasiswaService.deleteMahasiswa(req.params.id);
  sendResponse(res, 200, { message: 'Mahasiswa deleted' });
});

const eligiblePeserta = catchAsync(async (req, res) => {
  const { data, meta } = await mahasiswaService.listEligiblePeserta(req.query);
  sendResponse(res, 200, { message: 'Peserta lulus ujian fetched', data, meta });
});

const eligibleSummary = catchAsync(async (req, res) => {
  const data = await mahasiswaService.getEligibleSummary();
  sendResponse(res, 200, { message: 'Ringkasan peserta lulus ujian per jurusan fetched', data });
});

const generate = catchAsync(async (req, res) => {
  const { count, data } = await mahasiswaService.generateMahasiswaFromPeserta(req.body, req.user.id);
  sendResponse(res, 201, { message: `${count} mahasiswa berhasil dibuat dari peserta yang lulus ujian`, data });
});

const getBiodata = catchAsync(async (req, res) => {
  const data = await mahasiswaService.getBiodata(req.params.id);
  sendResponse(res, 200, { message: 'Biodata mahasiswa fetched', data });
});

const saveBiodata = catchAsync(async (req, res) => {
  const data = await mahasiswaService.saveBiodata(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Biodata mahasiswa saved', data });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await mahasiswaService.exportMahasiswa();
  await sendWorkbook(res, workbook, 'mahasiswa.xlsx');
});

const importExcel = catchAsync(async (req, res) => {
  const result = await mahasiswaService.importMahasiswa(req.body.file, req.user.id);
  sendResponse(res, 200, { message: 'Import mahasiswa selesai', data: result });
});

const importTemplate = catchAsync(async (req, res) => {
  const workbook = mahasiswaService.exportMahasiswaTemplate();
  await sendWorkbook(res, workbook, 'template-import-mahasiswa.xlsx');
});

module.exports = {
  list,
  detail,
  update,
  remove,
  eligiblePeserta,
  eligibleSummary,
  generate,
  getBiodata,
  saveBiodata,
  exportExcel,
  importExcel,
  importTemplate,
};
