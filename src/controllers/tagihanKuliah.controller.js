const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/tagihanKuliah.service');
const importService = require('../services/tagihanImport.service');
const { sendWorkbook } = require('../utils/excel');
const cicilanService = require('../services/tagihanCicilan.service');
const vaService = require('../services/virtualAccountMahasiswa.service');

const getCicilan = catchAsync(async (req, res) => {
  const data = await cicilanService.getCicilanTagihan(Number(req.params.id));
  sendResponse(res, 200, { message: 'Cicilan tagihan fetched', data });
});

const saveCicilan = catchAsync(async (req, res) => {
  const data = await cicilanService.saveCicilanTagihan(Number(req.params.id), req.body.cicilan, req.user.id);
  sendResponse(res, 200, { message: data.cicilan.length ? 'Cicilan tagihan disimpan' : 'Cicilan tagihan dihapus', data });
});

const generateCicilan = catchAsync(async (req, res) => {
  const data = await cicilanService.generateCicilanMassal(req.body, req.user.id);
  sendResponse(res, 201, { message: `Cicilan dibuat untuk ${data.dibuat} tagihan${data.dilewati ? `, ${data.dilewati} dilewati (sudah punya cicilan)` : ''}`, data });
});

const generate = catchAsync(async (req, res) => {
  const data = await service.generateTagihan(req.body.tahunAjaranId, req.user.id);
  sendResponse(res, 201, { message: `${data.generated} tagihan baru dibuat, ${data.updated} tagihan diperbarui`, data });
});

const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listTagihan(req.query);
  sendResponse(res, 200, { message: 'Tagihan kuliah fetched', data, meta });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await service.exportTagihan(req.query);
  await sendWorkbook(res, workbook, 'tagihan-mahasiswa.xlsx');
});

const riwayatMahasiswa = catchAsync(async (req, res) => {
  const data = await service.getRiwayatPembayaranMahasiswa(Number(req.params.mahasiswaId));
  sendResponse(res, 200, { message: 'Riwayat pembayaran mahasiswa', data });
});

const update = catchAsync(async (req, res) => {
  const data = await service.updateTagihan(Number(req.params.id), req.body, req.user.id);
  sendResponse(res, 200, { message: 'Tagihan diperbarui', data });
});

const remove = catchAsync(async (req, res) => {
  await service.deleteTagihan(Number(req.params.id));
  sendResponse(res, 200, { message: 'Tagihan dihapus' });
});

const detail = catchAsync(async (req, res) => {
  const data = await service.getTagihanById(req.params.id);
  sendResponse(res, 200, { message: 'Tagihan kuliah fetched', data });
});

const cariByNim = catchAsync(async (req, res) => {
  const search = req.query.nim ?? req.query.search;
  const data = await service.findTagihanAktifByNim(search, req.query.tahunAjaranId);
  sendResponse(res, 200, { message: 'Tagihan kuliah fetched', data });
});

// --- Import tagihan dari Excel bagian keuangan ---
const importPreview = catchAsync(async (req, res) => {
  const data = await importService.previewImport(req.body.file);
  sendResponse(res, 200, { message: 'Preview import tagihan', data });
});

const importCommit = catchAsync(async (req, res) => {
  const data = await importService.commitImport(req.body.file, req.body.fileName, req.user.id);
  const { baru, ubah, tetap, gagal } = data.summary;
  sendResponse(res, 200, { message: `Import selesai: ${baru} baru, ${ubah} diperbarui, ${tetap} tetap, ${gagal} gagal`, data });
});

const importTemplate = catchAsync(async (req, res) => {
  await sendWorkbook(res, importService.exportTemplate(), 'template-import-tagihan.xlsx');
});

const importRiwayat = catchAsync(async (req, res) => {
  const { data, meta } = await importService.listBatches(req.query);
  sendResponse(res, 200, { message: 'Riwayat import tagihan fetched', data, meta });
});

const importRiwayatDetail = catchAsync(async (req, res) => {
  const data = await importService.getBatchDetail(req.params.id);
  sendResponse(res, 200, { message: 'Detail import tagihan fetched', data });
});

// --- Import Virtual Account dari file bank (VA berganti tiap bulan) ---
const importVaPreview = catchAsync(async (req, res) => {
  const data = await vaService.previewImportVa(req.body.file);
  sendResponse(res, 200, { message: 'Preview import VA', data });
});

const importVaCommit = catchAsync(async (req, res) => {
  const data = await vaService.commitImportVa(req.body.file, req.user.id);
  const { baru, ubah, tetap, gagal } = data.summary;
  sendResponse(res, 200, { message: `Import VA selesai: ${baru} baru, ${ubah} diperbarui, ${tetap} tetap, ${gagal} gagal`, data });
});

const importVaTemplate = catchAsync(async (req, res) => {
  await sendWorkbook(res, vaService.exportTemplateVa(), 'template-import-va.xlsx');
});

const vaMahasiswa = catchAsync(async (req, res) => {
  const data = await vaService.listVaMahasiswa(Number(req.params.mahasiswaId));
  sendResponse(res, 200, { message: 'VA mahasiswa fetched', data });
});

module.exports = { importVaPreview, importVaCommit, importVaTemplate, vaMahasiswa, getCicilan, saveCicilan, generateCicilan, generate, list, exportExcel, riwayatMahasiswa, update, remove, detail, cariByNim, importPreview, importCommit, importTemplate, importRiwayat, importRiwayatDetail };
