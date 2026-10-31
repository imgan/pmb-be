const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const mataKuliahService = require('../services/mataKuliah.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await mataKuliahService.listMataKuliah(req.query);
  sendResponse(res, 200, { message: 'Mata kuliah fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await mataKuliahService.getMataKuliahById(req.params.id);
  sendResponse(res, 200, { message: 'Mata kuliah fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await mataKuliahService.createMataKuliah(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Mata kuliah ditambahkan', data });
});

const update = catchAsync(async (req, res) => {
  const data = await mataKuliahService.updateMataKuliah(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Mata kuliah diperbarui', data });
});

const remove = catchAsync(async (req, res) => {
  await mataKuliahService.deleteMataKuliah(req.params.id, req.user.id);
  sendResponse(res, 200, { message: 'Mata kuliah dihapus' });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await mataKuliahService.exportMataKuliah(req.query);
  await sendWorkbook(res, workbook, 'mata-kuliah.xlsx');
});

const importTemplate = catchAsync(async (req, res) => {
  await sendWorkbook(res, mataKuliahService.exportTemplate(), 'template-import-mata-kuliah.xlsx');
});

const importExcel = catchAsync(async (req, res) => {
  const result = await mataKuliahService.importMataKuliah(req.body.file, req.user.id, { kurikulumId: req.body.kurikulumId ?? null });
  sendResponse(res, 200, { message: 'Import mata kuliah selesai', data: result });
});

const settingKurikulum = catchAsync(async (req, res) => {
  const data = await mataKuliahService.saveSettingKurikulum(req.body, req.user.id);
  sendResponse(res, 200, { message: `Setting kurikulum disimpan (${data.updated} mata kuliah)`, data });
});

module.exports = { list, detail, create, update, remove, exportExcel, importTemplate, importExcel, settingKurikulum };
