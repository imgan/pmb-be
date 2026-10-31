const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/referensiJudul.service');

// Portal dosen → Lain-Lain → Referensi Judul (sumber: Pengajuan TA mahasiswa & Yudisium).
const filterDosen = catchAsync(async (req, res) => {
  const data = await service.getFilterOptions();
  sendResponse(res, 200, { message: 'Filter referensi judul fetched', data });
});

const listDosen = catchAsync(async (req, res) => {
  const data = await service.listUntukDosen(req.query);
  sendResponse(res, 200, { message: 'Referensi judul fetched', data });
});

module.exports = { filterDosen, listDosen };
