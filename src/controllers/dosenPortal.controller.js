const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const dosenPortalService = require('../services/dosenPortal.service');
const krsBimbinganService = require('../services/krsBimbingan.service');
const nilaiSidangService = require('../services/nilaiSidang.service');
const koreksiSidangService = require('../services/koreksiSidang.service');
const kampusService = require('../services/kampus.service');
const ApiError = require('../utils/ApiError');
const { buildLembarKoreksiSidangPdf, lembarKoreksiBaseName } = require('../services/lembarKoreksiSidangPdf.service');

const listJadwal = catchAsync(async (req, res) => {
  const data = await dosenPortalService.listJadwalKuliahForDosen(req.dosen.id, req.tahunAjaranId);
  sendResponse(res, 200, { message: 'Jadwal kuliah fetched', data });
});

const ringkasanKelas = catchAsync(async (req, res) => {
  const data = await dosenPortalService.getRingkasanKelas(req.dosen.id, Number(req.params.id));
  sendResponse(res, 200, { message: 'Ringkasan kelas fetched', data });
});

const listRealisasi = catchAsync(async (req, res) => {
  const { data, meta } = await dosenPortalService.listRealisasiMengajar(req.dosen.id, req.query, req.tahunAjaranId);
  sendResponse(res, 200, { message: 'Realisasi mengajar fetched', data, meta });
});

const createRealisasi = catchAsync(async (req, res) => {
  const data = await dosenPortalService.createRealisasiMengajar(req.dosen.id, req.body);
  sendResponse(res, 201, { message: 'Realisasi mengajar berhasil disimpan', data });
});

const updateRealisasi = catchAsync(async (req, res) => {
  const data = await dosenPortalService.updateRealisasiMengajar(req.dosen.id, req.params.id, req.body);
  sendResponse(res, 200, { message: 'Realisasi mengajar berhasil diperbarui', data });
});

const kelasAktif = catchAsync(async (req, res) => {
  const data = await dosenPortalService.getKelasAktif(req.dosen.id);
  sendResponse(res, 200, { message: 'Kelas aktif fetched', data });
});

const startKelas = catchAsync(async (req, res) => {
  const data = await dosenPortalService.startKelas(req.dosen.id, req.body);
  sendResponse(res, 201, { message: 'Kelas dimulai', data });
});

const stopKelas = catchAsync(async (req, res) => {
  const data = await dosenPortalService.stopKelas(req.dosen.id, req.params.id, req.body);
  sendResponse(res, 200, { message: 'Kelas selesai', data });
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
  const data = await dosenPortalService.listSilabusMataKuliah(req.dosen.id, req.tahunAjaranId);
  sendResponse(res, 200, { message: 'Silabus matakuliah fetched', data });
});

const listNilaiSidang = catchAsync(async (req, res) => {
  const data = await nilaiSidangService.listForDosen(req.dosen.id);
  sendResponse(res, 200, { message: 'Nilai sidang fetched', data });
});

const saveNilaiSidang = catchAsync(async (req, res) => {
  const data = await nilaiSidangService.saveForDosen(req.dosen.id, req.params.pendaftarSidangId, req.body);
  sendResponse(res, 200, { message: 'Nilai sidang berhasil disimpan', data });
});

const requirePeran = (req) => {
  if (!req.query.peran) throw new ApiError(400, 'Parameter peran wajib diisi');
  return req.query.peran;
};

const listKoreksiSidang = catchAsync(async (req, res) => {
  const data = await koreksiSidangService.listItems(req.dosen.id, req.params.pendaftarSidangId, requirePeran(req));
  sendResponse(res, 200, { message: 'Koreksi sidang fetched', data });
});

const createKoreksiSidang = catchAsync(async (req, res) => {
  const data = await koreksiSidangService.createItem(req.dosen.id, req.params.pendaftarSidangId, req.body);
  sendResponse(res, 201, { message: 'Butir koreksi berhasil ditambahkan', data });
});

const updateKoreksiSidang = catchAsync(async (req, res) => {
  const data = await koreksiSidangService.updateItem(req.dosen.id, req.params.id, req.body);
  sendResponse(res, 200, { message: 'Butir koreksi berhasil diperbarui', data });
});

const removeKoreksiSidang = catchAsync(async (req, res) => {
  await koreksiSidangService.deleteItem(req.dosen.id, req.params.id);
  sendResponse(res, 200, { message: 'Butir koreksi berhasil dihapus' });
});

const koreksiSidangPdf = catchAsync(async (req, res) => {
  const [data, kampus] = await Promise.all([
    koreksiSidangService.getCetakData(req.dosen.id, req.params.pendaftarSidangId, requirePeran(req)),
    kampusService.getKampus(),
  ]);
  const doc = buildLembarKoreksiSidangPdf(data, kampus);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${lembarKoreksiBaseName(data)}.pdf"`);
  doc.pipe(res);
});

// KRS mahasiswa bimbingan akademik (persetujuan oleh dosen PA).
const listKrsBimbingan = catchAsync(async (req, res) => {
  const data = await krsBimbinganService.listKrsBimbingan(req.dosen.id, { tahunAjaranId: req.tahunAjaranId ?? undefined, ...req.query });
  sendResponse(res, 200, { message: 'KRS bimbingan fetched', data });
});

const setujuiKrs = catchAsync(async (req, res) => {
  const data = await krsBimbinganService.setStatusKrsBimbingan(req.dosen.id, Number(req.params.id), 'DISETUJUI');
  sendResponse(res, 200, { message: 'KRS disetujui', data });
});

const setujuiMassalKrs = catchAsync(async (req, res) => {
  const data = await krsBimbinganService.setujuiMassalKrsBimbingan(req.dosen.id, req.body.ids);
  sendResponse(res, 200, { message: `${data.disetujui} KRS disetujui`, data });
});

const tolakKrs = catchAsync(async (req, res) => {
  const data = await krsBimbinganService.setStatusKrsBimbingan(req.dosen.id, Number(req.params.id), 'DITOLAK');
  sendResponse(res, 200, { message: 'KRS ditolak', data });
});

module.exports = {
  listKrsBimbingan,
  setujuiKrs,
  setujuiMassalKrs,
  tolakKrs,
  ringkasanKelas,
  updateRealisasi,
  kelasAktif,
  startKelas,
  stopKelas,
  listKoreksiSidang,
  createKoreksiSidang,
  updateKoreksiSidang,
  removeKoreksiSidang,
  koreksiSidangPdf,
  listNilaiSidang,
  saveNilaiSidang,
  listJadwal,
  listRealisasi,
  createRealisasi,
  removeRealisasi,
  getPresensi,
  savePresensi,
  listRekapMahasiswa,
  listSilabus,
};
