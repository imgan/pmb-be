const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const jadwalKuliahService = require('../services/jadwalKuliah.service');
const ruanganService = require('../services/ruangan.service');
const matakuliahAktifService = require('../services/matakuliahAktif.service');
const { exportJadwalKuliahV2 } = require('../services/jadwalKuliahExportV2.service');
const { getPesertaKelas } = require('../services/dosenKelas.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await jadwalKuliahService.listJadwalKuliah(req.query);
  sendResponse(res, 200, { message: 'Jadwal kuliah fetched', data, meta });
});

const ruanganOptions = catchAsync(async (req, res) => {
  const data = await ruanganService.getRuanganOptions();
  sendResponse(res, 200, { message: 'Ruangan options fetched', data });
});

const kelasOptions = catchAsync(async (req, res) => {
  const data = await jadwalKuliahService.getKelasOptions();
  sendResponse(res, 200, { message: 'Kelas options fetched', data });
});

const detail = catchAsync(async (req, res) => {
  const data = await jadwalKuliahService.getJadwalKuliahById(req.params.id);
  sendResponse(res, 200, { message: 'Jadwal kuliah fetched', data });
});

// Peserta kelas + rekap kehadiran (Master Monitoring BAAK → Detail).
const peserta = catchAsync(async (req, res) => {
  const data = await getPesertaKelas(req.params.id);
  sendResponse(res, 200, { message: 'Peserta kelas fetched', data });
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

// Format cetak prodi: satu prodi + semester (tahun ajaran default: yang aktif).
// Akun ber-role PRODI hanya boleh meng-export prodinya sendiri.
const exportExcelV2 = catchAsync(async (req, res) => {
  const kodeProdi = req.user.role?.code === 'PRODI' ? req.user.kodeProdi : req.query.kodeProdi;
  const { workbook, filename } = await exportJadwalKuliahV2({ ...req.query, kodeProdi });
  await sendWorkbook(res, workbook, filename);
});

const importExcel = catchAsync(async (req, res) => {
  const result = await jadwalKuliahService.importJadwalKuliah(req.body.file, req.user.id);
  sendResponse(res, 200, { message: 'Import jadwal kuliah selesai', data: result });
});

const importTemplate = catchAsync(async (req, res) => {
  const workbook = jadwalKuliahService.exportJadwalKuliahTemplate();
  await sendWorkbook(res, workbook, 'template-import-jadwal-kuliah.xlsx');
});

const matakuliahOptions = catchAsync(async (req, res) => {
  const data = await matakuliahAktifService.getJadwalOptions(Number(req.query.tahunAjaranId) || null);
  sendResponse(res, 200, { message: 'Matakuliah aktif options fetched', data });
});

module.exports = {
  ruanganOptions,
  peserta,
  matakuliahOptions,
  list,
  kelasOptions,
  detail,
  create,
  update,
  remove,
  exportExcel,
  exportExcelV2,
  importExcel,
  importTemplate,
};
