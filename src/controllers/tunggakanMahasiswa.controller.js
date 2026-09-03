const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const service = require('../services/tunggakanMahasiswa.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listTunggakanMahasiswa(req.query);
  sendResponse(res, 200, { message: 'Tunggakan mahasiswa fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await service.getTunggakanMahasiswaById(req.params.id);
  sendResponse(res, 200, { message: 'Tunggakan mahasiswa fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await service.createTunggakanMahasiswa(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Tunggakan mahasiswa created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await service.updateTunggakanMahasiswa(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Tunggakan mahasiswa updated', data });
});

const remove = catchAsync(async (req, res) => {
  await service.deleteTunggakanMahasiswa(req.params.id);
  sendResponse(res, 200, { message: 'Tunggakan mahasiswa deleted' });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await service.exportTunggakanMahasiswa();
  await sendWorkbook(res, workbook, 'tunggakan-mahasiswa.xlsx');
});

const importExcel = catchAsync(async (req, res) => {
  const result = await service.importTunggakanMahasiswa(req.body.file, req.user.id);
  sendResponse(res, 200, { message: 'Import tunggakan mahasiswa selesai', data: result });
});

const importTemplate = catchAsync(async (req, res) => {
  const workbook = service.exportTunggakanMahasiswaTemplate();
  await sendWorkbook(res, workbook, 'template-import-tunggakan-mahasiswa.xlsx');
});

module.exports = { list, detail, create, update, remove, exportExcel, importExcel, importTemplate };
