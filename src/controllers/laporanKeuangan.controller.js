const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const service = require('../services/laporanKeuangan.service');
const pembayaranTaSkripsiService = require('../services/pembayaranTaSkripsi.service');
const pembayaranLainService = require('../services/pembayaranLain.service');

const tunggakanMahasiswa = catchAsync(async (req, res) => {
  const data = await service.listTunggakanMahasiswa({
    tahunAjaranId: req.query.tahunAjaranId ? Number(req.query.tahunAjaranId) : undefined,
  });
  sendResponse(res, 200, { message: 'Laporan tunggakan mahasiswa fetched', data });
});

const bebasTunggakan = catchAsync(async (req, res) => {
  const data = await service.listBebasTunggakan({
    tahunAjaranId: req.query.tahunAjaranId ? Number(req.query.tahunAjaranId) : undefined,
  });
  sendResponse(res, 200, { message: 'Laporan bebas tunggakan fetched', data });
});

const uangKuliah = catchAsync(async (req, res) => {
  const { data, grandTotal } = await service.listLaporanUangKuliah({
    tahunAjaranId: req.query.tahunAjaranId ? Number(req.query.tahunAjaranId) : undefined,
  });
  sendResponse(res, 200, { message: 'Laporan uang kuliah fetched', data, meta: { grandTotal } });
});

const tunggakan = catchAsync(async (req, res) => {
  const { data, grandTotal } = await service.listTunggakanPerJurusan({
    tahunAjaranId: req.query.tahunAjaranId ? Number(req.query.tahunAjaranId) : undefined,
  });
  sendResponse(res, 200, { message: 'Laporan tunggakan fetched', data, meta: { grandTotal } });
});

const exportTunggakan = catchAsync(async (req, res) => {
  const workbook = await service.exportTunggakanPerJurusan({
    tahunAjaranId: req.query.tahunAjaranId ? Number(req.query.tahunAjaranId) : undefined,
  });
  await sendWorkbook(res, workbook, 'laporan-tunggakan.xlsx');
});

const sertifikasi = catchAsync(async (req, res) => {
  const { data, grandTotal } = await service.listLaporanSertifikasi({
    dateFrom: req.query.dateFrom || undefined,
    dateTo: req.query.dateTo || undefined,
    statusSertifikasi: req.query.statusSertifikasi || undefined,
  });
  sendResponse(res, 200, { message: 'Laporan sertifikasi fetched', data, meta: { grandTotal } });
});

const tunggakanTaSkripsi = catchAsync(async (req, res) => {
  const data = await pembayaranTaSkripsiService.getRingkasanTaSkripsiByNim(req.query.nim);
  sendResponse(res, 200, { message: 'Ringkasan tunggakan TA/Skripsi fetched', data });
});

const tunggakanBiayaLain = catchAsync(async (req, res) => {
  const data = await pembayaranLainService.getRingkasanBiayaLainByNim(req.query.nim);
  sendResponse(res, 200, { message: 'Ringkasan tunggakan biaya lain fetched', data });
});

const exportTunggakanPerMahasiswa = catchAsync(async (req, res) => {
  const workbook = await service.exportTunggakanPerMahasiswa({
    tahunAjaranId: req.query.tahunAjaranId ? Number(req.query.tahunAjaranId) : undefined,
  });
  await sendWorkbook(res, workbook, 'tunggakan-per-mahasiswa.xlsx');
});

const exportTunggakanPerJurusan = catchAsync(async (req, res) => {
  const workbook = await service.exportTunggakanPerJurusan({
    tahunAjaranId: req.query.tahunAjaranId ? Number(req.query.tahunAjaranId) : undefined,
  });
  await sendWorkbook(res, workbook, 'tunggakan-per-jurusan.xlsx');
});

module.exports = {
  tunggakanMahasiswa,
  bebasTunggakan,
  uangKuliah,
  tunggakan,
  exportTunggakan,
  sertifikasi,
  tunggakanTaSkripsi,
  tunggakanBiayaLain,
  exportTunggakanPerMahasiswa,
  exportTunggakanPerJurusan,
};
