const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const nilaiMahasiswaService = require('../services/nilaiMahasiswa.service');

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

module.exports = { list, detail, semesterSummary, listEntries, updateEntry };
