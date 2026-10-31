const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const service = require('../services/tunggakanMahasiswa.service');
const tagihanKuliahService = require('../services/tagihanKuliah.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listTunggakanMahasiswa(req.query);
  sendResponse(res, 200, { message: 'Tunggakan mahasiswa fetched', data, meta });
});

const riwayatPembayaran = catchAsync(async (req, res) => {
  const data = await tagihanKuliahService.getRiwayatPembayaranMahasiswa(Number(req.params.mahasiswaId));
  sendResponse(res, 200, { message: 'Riwayat pembayaran mahasiswa', data });
});

const listOtomatis = catchAsync(async (req, res) => {
  const { data, meta } = await service.listTunggakanOtomatis(req.query);
  sendResponse(res, 200, { message: 'Tunggakan otomatis dari tagihan semester lalu', data, meta });
});

const exportOtomatis = catchAsync(async (req, res) => {
  await sendWorkbook(res, await service.exportTunggakanOtomatis(req.query), 'tunggakan-semester-lalu.xlsx');
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

module.exports = { list, listOtomatis, riwayatPembayaran, exportOtomatis, detail, create, update, remove, exportExcel, importExcel, importTemplate };
