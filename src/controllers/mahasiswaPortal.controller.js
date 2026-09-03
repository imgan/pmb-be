const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/mahasiswaPortal.service');

const tahunAjaranAktif = catchAsync(async (req, res) => {
  const data = await service.getTahunAjaranAktif();
  sendResponse(res, 200, { message: 'Tahun ajaran aktif fetched', data });
});

const listJadwalTersedia = catchAsync(async (req, res) => {
  const data = await service.listJadwalTersedia(req.query);
  sendResponse(res, 200, { message: 'Jadwal tersedia fetched', data });
});

const semesterBerjalan = catchAsync(async (req, res) => {
  const data = await service.getSemesterBerjalan(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Semester berjalan fetched', data });
});

const kuotaSks = catchAsync(async (req, res) => {
  const data = await service.getKuotaSks(req.mahasiswa.id, req.query.semester);
  sendResponse(res, 200, { message: 'Kuota SKS fetched', data });
});

const listKrs = catchAsync(async (req, res) => {
  const data = await service.listKrs(req.mahasiswa.id, req.query);
  sendResponse(res, 200, { message: 'KRS fetched', data });
});

const saveKrsDraft = catchAsync(async (req, res) => {
  const data = await service.saveKrsDraft(req.mahasiswa.id, req.body);
  sendResponse(res, 200, { message: 'KRS draft berhasil disimpan', data });
});

const ajukanKrs = catchAsync(async (req, res) => {
  const data = await service.ajukanKrs(req.mahasiswa.id, req.params.id);
  sendResponse(res, 200, { message: 'KRS berhasil diajukan', data });
});

const listNilai = catchAsync(async (req, res) => {
  const data = await service.listNilai(req.mahasiswa.id, req.query);
  sendResponse(res, 200, { message: 'Nilai (KHS) fetched', data });
});

const getTranskrip = catchAsync(async (req, res) => {
  const data = await service.getTranskrip(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Transkrip fetched', data });
});

const listSuratKeterangan = catchAsync(async (req, res) => {
  const data = await service.listSuratKeterangan(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Pengajuan surat fetched', data });
});

const createSuratKeterangan = catchAsync(async (req, res) => {
  const data = await service.createSuratKeterangan(req.mahasiswa.id, req.body);
  sendResponse(res, 201, { message: 'Pengajuan surat berhasil dikirim', data });
});

const suratKeteranganPdf = catchAsync(async (req, res) => {
  const { doc, filename } = await service.getSuratKeteranganPdf(req.mahasiswa.id, req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);
});

module.exports = {
  tahunAjaranAktif,
  listJadwalTersedia,
  semesterBerjalan,
  kuotaSks,
  listKrs,
  saveKrsDraft,
  ajukanKrs,
  listNilai,
  getTranskrip,
  listSuratKeterangan,
  createSuratKeterangan,
  suratKeteranganPdf,
};
