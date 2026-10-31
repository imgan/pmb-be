const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const golonganKelasService = require('../services/golonganKelas.service');
const jurusanService = require('../services/jurusan.service');
const academicContextService = require('../services/academicContext.service');
const tahunModulService = require('../services/tahunModul.service');
const gelombangService = require('../services/gelombang.service');
const menuService = require('../services/menu.service');
const kampusService = require('../services/kampus.service');
const beasiswaService = require('../services/beasiswa.service');
const biayaKuliahService = require('../services/biayaKuliah.service');
const calonMahasiswaService = require('../services/calonMahasiswa.service');
const homeImageService = require('../services/homeImage.service');
const { SumberInformasi } = require('../models');

const listGolonganKelas = catchAsync(async (req, res) => {
  const { data } = await golonganKelasService.listGolonganKelas({ limit: 100 });
  sendResponse(res, 200, { message: 'Golongan kelas fetched', data });
});

const listJurusan = catchAsync(async (req, res) => {
  const { data } = await jurusanService.listJurusan({ limit: 200, golonganKelasId: req.query.golonganKelasId });
  sendResponse(res, 200, { message: 'Jurusan fetched', data });
});

// Pilihan Tahun Akademik & Prodi pada form login staff.
const loginOptions = catchAsync(async (req, res) => {
  const [tahunAkademik, prodi, padananPmb, padananKeuangan] = await Promise.all([
    academicContextService.listTahunAkademik(),
    academicContextService.listProdi(),
    tahunModulService.padananTahunAjaran('pmb'),
    tahunModulService.padananTahunAjaran('keuangan'),
  ]);
  sendResponse(res, 200, {
    message: 'Login options fetched',
    // bawaan: pilihan tahun default form login modul PMB / Keuangan (padanan Tahun Ajaran PMB / Keuangan aktif).
    data: { tahunAkademik, prodi, bawaan: { pmb: padananPmb?.id ?? null, keuangan: padananKeuangan?.id ?? null } },
  });
});

const activeGelombang = catchAsync(async (req, res) => {
  const data = await gelombangService.getActiveGelombang();
  sendResponse(res, 200, { message: 'Active gelombang fetched', data });
});

const listMenus = catchAsync(async (req, res) => {
  const data = await menuService.getPublicMenus();
  sendResponse(res, 200, { message: 'Public menus fetched', data });
});

const kampus = catchAsync(async (req, res) => {
  const data = await kampusService.getKampus();
  sendResponse(res, 200, { message: 'Kampus fetched', data });
});

const listSumberInformasi = catchAsync(async (req, res) => {
  const data = await SumberInformasi.findAll({ attributes: ['id', 'namaInformasi'], order: [['id', 'ASC']] });
  sendResponse(res, 200, { message: 'Sumber informasi fetched', data });
});

const listBeasiswa = catchAsync(async (req, res) => {
  const data = await beasiswaService.listPublicBeasiswa();
  sendResponse(res, 200, { message: 'Beasiswa fetched', data });
});

const beasiswaDetail = catchAsync(async (req, res) => {
  const data = await beasiswaService.getPublicBeasiswaBySlug(req.params.slug);
  sendResponse(res, 200, { message: 'Beasiswa fetched', data });
});

const listBiayaKuliah = catchAsync(async (req, res) => {
  const data = await biayaKuliahService.listPublicBiayaKuliah();
  sendResponse(res, 200, { message: 'Biaya kuliah fetched', data });
});

const biayaKuliahDetail = catchAsync(async (req, res) => {
  const data = await biayaKuliahService.getPublicBiayaKuliahBySlug(req.params.slug);
  sendResponse(res, 200, { message: 'Biaya kuliah fetched', data });
});

const listCalonMahasiswa = catchAsync(async (req, res) => {
  const { data, meta } = await calonMahasiswaService.listPublicCalonMahasiswa(req.query);
  sendResponse(res, 200, { message: 'Calon mahasiswa fetched', data, meta });
});

const calonMahasiswaStats = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.getPublicStats(req.query);
  sendResponse(res, 200, { message: 'Calon mahasiswa stats fetched', data });
});

const homeImages = catchAsync(async (req, res) => {
  const data = await homeImageService.getHomeImages();
  sendResponse(res, 200, { message: 'Home images fetched', data });
});

module.exports = {
  listGolonganKelas,
  listJurusan,
  loginOptions,
  activeGelombang,
  listMenus,
  kampus,
  listBeasiswa,
  listSumberInformasi,
  beasiswaDetail,
  listBiayaKuliah,
  biayaKuliahDetail,
  listCalonMahasiswa,
  calonMahasiswaStats,
  homeImages,
};
