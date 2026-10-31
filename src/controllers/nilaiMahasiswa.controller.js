const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const nilaiMahasiswaService = require('../services/nilaiMahasiswa.service');
const nilaiImportService = require('../services/nilaiImport.service');
const { sendWorkbook } = require('../utils/excel');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await nilaiMahasiswaService.searchMahasiswa(req.query);
  sendResponse(res, 200, { message: 'Mahasiswa fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const { mahasiswa, nilai, meta } = await nilaiMahasiswaService.getNilaiByMahasiswa(req.params.mahasiswaId, req.query);
  sendResponse(res, 200, { message: 'Nilai mahasiswa fetched', data: { mahasiswa, nilai }, meta });
});

const semesterSummary = catchAsync(async (req, res) => {
  const data = await nilaiMahasiswaService.getSemesterSummary();
  sendResponse(res, 200, { message: 'Semester summary fetched', data });
});

const listEntries = catchAsync(async (req, res) => {
  const { data, meta } = await nilaiMahasiswaService.searchNilaiEntries(req.query);
  sendResponse(res, 200, { message: 'Nilai entries fetched', data, meta });
});

const updateEntry = catchAsync(async (req, res) => {
  const data = await nilaiMahasiswaService.updateNilaiEntry(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Nilai updated', data });
});

// Import nilai format "Nilai" PDDikti Feeder (lihat nilaiImport.service.js).
const importExcel = catchAsync(async (req, res) => {
  const data = await nilaiImportService.importNilaiMahasiswa(req.body.file);
  sendResponse(res, 200, { message: 'Import nilai selesai', data });
});

const importTemplate = catchAsync(async (req, res) => {
  await sendWorkbook(res, nilaiImportService.exportTemplateNilai(), 'template-import-nilai.xlsx');
});

module.exports = { list, detail, semesterSummary, listEntries, updateEntry, importExcel, importTemplate };
