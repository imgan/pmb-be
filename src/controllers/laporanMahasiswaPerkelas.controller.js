const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const laporanMahasiswaPerkelasService = require('../services/laporanMahasiswaPerkelas.service');

const filterOptions = catchAsync(async (req, res) => {
  const data = await laporanMahasiswaPerkelasService.getFilterOptions();
  sendResponse(res, 200, { message: 'Filter options fetched', data });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await laporanMahasiswaPerkelasService.buildPerkelasWorkbook(req.query);
  await sendWorkbook(res, workbook, 'mahasiswa-per-kelas.xlsx');
});

module.exports = { filterOptions, exportExcel };
