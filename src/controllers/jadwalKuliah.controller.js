const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const jadwalKuliahService = require('../services/jadwalKuliah.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await jadwalKuliahService.listJadwalKuliah(req.query);
  sendResponse(res, 200, { message: 'Jadwal kuliah fetched', data, meta });
});

const kelasOptions = catchAsync(async (req, res) => {
  const data = await jadwalKuliahService.getKelasOptions();
  sendResponse(res, 200, { message: 'Kelas options fetched', data });
});

const detail = catchAsync(async (req, res) => {
  const data = await jadwalKuliahService.getJadwalKuliahById(req.params.id);
  sendResponse(res, 200, { message: 'Jadwal kuliah fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await jadwalKuliahService.createJadwalKuliah(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Jadwal kuliah created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await jadwalKuliahService.updateJadwalKuliah(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Jadwal kuliah updated', data });
});

const remove = catchAsync(async (req, res) => {
  await jadwalKuliahService.deleteJadwalKuliah(req.params.id);
  sendResponse(res, 200, { message: 'Jadwal kuliah deleted' });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await jadwalKuliahService.exportJadwalKuliah();
  await sendWorkbook(res, workbook, 'jadwal-kuliah.xlsx');
});

const importExcel = catchAsync(async (req, res) => {
  const result = await jadwalKuliahService.importJadwalKuliah(req.body.file, req.user.id);
  sendResponse(res, 200, { message: 'Import jadwal kuliah selesai', data: result });
});

const importTemplate = catchAsync(async (req, res) => {
  const workbook = jadwalKuliahService.exportJadwalKuliahTemplate();
  await sendWorkbook(res, workbook, 'template-import-jadwal-kuliah.xlsx');
});

module.exports = {
  list,
  kelasOptions,
  detail,
  create,
  update,
  remove,
  exportExcel,
  importExcel,
  importTemplate,
};
