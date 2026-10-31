const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/generateNim.service');

const listMahasiswa = catchAsync(async (req, res) => {
  const { data, meta } = await service.listMahasiswaBaru(req.query);
  sendResponse(res, 200, { message: 'Mahasiswa baru fetched', data, meta });
});

const listKelas = catchAsync(async (req, res) => {
  const data = await service.listKelas(req.query);
  sendResponse(res, 200, { message: 'Kelas mahasiswa baru fetched', data });
});

const setKelas = catchAsync(async (req, res) => {
  const data = await service.setKelas(req.body);
  sendResponse(res, 200, { message: `Kelas ${data.updated} mahasiswa berhasil disimpan`, data });
});

const generateKrs = catchAsync(async (req, res) => {
  const data = await service.generateKrs(req.body, req.user.id);
  sendResponse(res, 201, {
    message: `KRS semester 1 kelas ${req.body.namaKelas}: ${data.created} dibuat, ${data.updated} diperbarui (${data.jumlahMataKuliah} mata kuliah)`,
    data,
  });
});

const generateTagihan = catchAsync(async (req, res) => {
  const data = await service.generateTagihan(req.body, req.user.id);
  const skipped = data.skippedCount ? `, ${data.skippedCount} dilewati (tarif kuliah belum terdaftar)` : '';
  sendResponse(res, 201, {
    message: `Tagihan semester 1 kelas ${req.body.namaKelas}: ${data.generated} dibuat, ${data.updated} diperbarui${skipped}`,
    data,
  });
});

const generateStatusAktif = catchAsync(async (req, res) => {
  const data = await service.generateStatusAktif(req.body, req.user.id);
  sendResponse(res, 201, {
    message: `Status aktif semester 1 kelas ${req.body.namaKelas} (periode ${data.periode}): ${data.created} dibuat, ${data.updated} diperbarui`,
    data,
  });
});

module.exports = { listMahasiswa, listKelas, setKelas, generateKrs, generateTagihan, generateStatusAktif };
