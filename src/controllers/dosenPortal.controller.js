const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const dosenPortalService = require('../services/dosenPortal.service');

const listJadwal = catchAsync(async (req, res) => {
  const data = await dosenPortalService.listJadwalKuliahForDosen(req.dosen.id);
  sendResponse(res, 200, { message: 'Jadwal kuliah fetched', data });
});

const listRealisasi = catchAsync(async (req, res) => {
  const { data, meta } = await dosenPortalService.listRealisasiMengajar(req.dosen.id, req.query);
  sendResponse(res, 200, { message: 'Realisasi mengajar fetched', data, meta });
});

const createRealisasi = catchAsync(async (req, res) => {
  const data = await dosenPortalService.createRealisasiMengajar(req.dosen.id, req.body);
  sendResponse(res, 201, { message: 'Realisasi mengajar berhasil disimpan', data });
});

const removeRealisasi = catchAsync(async (req, res) => {
  await dosenPortalService.deleteRealisasiMengajar(req.dosen.id, req.params.id);
  sendResponse(res, 200, { message: 'Realisasi mengajar berhasil dihapus' });
});

const getPresensi = catchAsync(async (req, res) => {
  const data = await dosenPortalService.getPresensiMahasiswa(req.dosen.id, req.params.id);
  sendResponse(res, 200, { message: 'Presensi mahasiswa fetched', data });
});

const savePresensi = catchAsync(async (req, res) => {
  const data = await dosenPortalService.savePresensiMahasiswa(req.dosen.id, req.params.id, req.body.items);
  sendResponse(res, 200, { message: 'Presensi mahasiswa berhasil disimpan', data });
});

const listRekapMahasiswa = catchAsync(async (req, res) => {
  const { data, meta } = await dosenPortalService.listRekapMahasiswa(req.dosen.id, req.query);
  sendResponse(res, 200, { message: 'Rekap mahasiswa fetched', data, meta });
});

const listSilabus = catchAsync(async (req, res) => {
  const data = await dosenPortalService.listSilabusMataKuliah(req.dosen.id);
  sendResponse(res, 200, { message: 'Silabus matakuliah fetched', data });
});

module.exports = {
  listJadwal,
  listRealisasi,
  createRealisasi,
  removeRealisasi,
  getPresensi,
  savePresensi,
  listRekapMahasiswa,
  listSilabus,
};
