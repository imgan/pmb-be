const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const dashboardPmbService = require('../services/dashboardPmb.service');
const pesertaService = require('../services/peserta.service');
const calonMahasiswaService = require('../services/calonMahasiswa.service');
const ujianPesertaService = require('../services/ujianPeserta.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await pesertaService.listPeserta(req.query);
  sendResponse(res, 200, { message: 'Peserta fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await pesertaService.getPesertaById(req.params.id);
  sendResponse(res, 200, { message: 'Peserta fetched', data });
});

const register = catchAsync(async (req, res) => {
  const { peserta, emailSent } = await pesertaService.registerPeserta(req.body);
  sendResponse(res, 201, {
    message: emailSent
      ? 'Registrasi berhasil. Masuk dengan nomor HP sebagai username & password awal; detail akun juga dikirim ke email Anda'
      : 'Registrasi berhasil. Masuk dengan nomor HP sebagai username & password awal',
    data: peserta,
  });
});

const create = catchAsync(async (req, res) => {
  const { peserta, emailSent } = await pesertaService.createPeserta(req.body, req.user.id);
  sendResponse(res, 201, {
    message: emailSent ? 'Peserta created, password sent via email' : 'Peserta created, but failed to send email',
    data: peserta,
  });
});

const update = catchAsync(async (req, res) => {
  const data = await pesertaService.updatePeserta(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Peserta updated', data });
});

const remove = catchAsync(async (req, res) => {
  await pesertaService.deletePeserta(req.params.id, req.user.id);
  sendResponse(res, 200, { message: 'Peserta deleted' });
});

const login = catchAsync(async (req, res) => {
  const { username, email, password } = req.body;
  const data = await pesertaService.loginPeserta(username ?? email, password);
  sendResponse(res, 200, { message: 'Login successful', data });
});

const gantiPassword = catchAsync(async (req, res) => {
  const data = await pesertaService.gantiPasswordSaya(req.peserta.id, req.body);
  sendResponse(res, 200, { message: 'Password berhasil diganti', data });
});

const resetPasswordDefault = catchAsync(async (req, res) => {
  const data = await pesertaService.resetPasswordDefault(req.params.id, req.user.id);
  sendResponse(res, 200, { message: 'Password direset ke nomor HP; peserta wajib menggantinya saat login', data });
});

const forgotPassword = catchAsync(async (req, res) => {
  await pesertaService.forgotPasswordPeserta(req.body.email);
  sendResponse(res, 200, { message: 'Jika email terdaftar, link reset password telah dikirim' });
});

const resetPassword = catchAsync(async (req, res) => {
  await pesertaService.resetPasswordPeserta(req.body.token, req.body.password);
  sendResponse(res, 200, { message: 'Password berhasil direset, silakan login dengan password baru' });
});

const me = catchAsync(async (req, res) => {
  const data = await pesertaService.getMyProfile(req.peserta.id);
  sendResponse(res, 200, { message: 'Profile fetched', data });
});

const updateMe = catchAsync(async (req, res) => {
  const data = await pesertaService.updateMyProfile(req.peserta.id, req.body);
  sendResponse(res, 200, { message: 'Profile updated', data });
});

const saveBiodata = catchAsync(async (req, res) => {
  const data = await pesertaService.saveBiodata(req.peserta.id, req.body);
  sendResponse(res, 200, { message: 'Biodata saved', data });
});

// ---- Admin: biodata peserta (menu Peserta) ----
const saveBiodataAdmin = catchAsync(async (req, res) => {
  const data = await pesertaService.saveBiodata(req.params.id, req.body, 'admin');
  sendResponse(res, 200, { message: 'Biodata peserta disimpan', data });
});

const setBiodataLock = catchAsync(async (req, res) => {
  const data = await pesertaService.setBiodataLock(req.params.id, req.body.isLocked);
  sendResponse(res, 200, { message: req.body.isLocked ? 'Biodata dikunci' : 'Kunci biodata dibuka', data });
});

const removeBiodata = catchAsync(async (req, res) => {
  const data = await pesertaService.removeBiodata(req.params.id);
  sendResponse(res, 200, { message: 'Biodata peserta dihapus', data });
});

const listMyDokumen = catchAsync(async (req, res) => {
  const data = await pesertaService.listMyDokumen(req.peserta.id);
  sendResponse(res, 200, { message: 'Dokumen fetched', data });
});

const uploadMyDokumen = catchAsync(async (req, res) => {
  const data = await pesertaService.uploadMyDokumen(req.peserta.id, req.params.dokumenKelengkapanId, req.body);
  sendResponse(res, 200, { message: 'Dokumen uploaded', data });
});

const removeMyDokumen = catchAsync(async (req, res) => {
  await pesertaService.removeMyDokumen(req.peserta.id, req.params.dokumenKelengkapanId);
  sendResponse(res, 200, { message: 'Dokumen removed' });
});

const getMyDataPmb = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.getDataPmbPeserta(req.peserta.id);
  sendResponse(res, 200, { message: 'Data pendaftaran fetched', data });
});

const listMyTesUjian = catchAsync(async (req, res) => {
  const data = await ujianPesertaService.listTesUjianPeserta(req.peserta.id);
  sendResponse(res, 200, { message: 'Jadwal tes ujian fetched', data });
});

const mulaiMyTesUjian = catchAsync(async (req, res) => {
  const data = await ujianPesertaService.mulaiUjian(req.peserta.id, req.params.id);
  sendResponse(res, 200, { message: 'Lembar ujian fetched', data });
});

const simpanJawabanMyTesUjian = catchAsync(async (req, res) => {
  const data = await ujianPesertaService.simpanJawaban(req.peserta.id, req.params.id, req.body);
  sendResponse(res, 200, { message: 'Jawaban disimpan', data });
});

const kirimMyTesUjian = catchAsync(async (req, res) => {
  const data = await ujianPesertaService.kirimUjian(req.peserta.id, req.params.id);
  sendResponse(res, 200, { message: 'Jawaban ujian dikirim', data });
});

const saveMyDataPmb = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.saveDataPmbPeserta(req.peserta.id, req.body);
  sendResponse(res, 200, { message: 'Data pendaftaran saved', data });
});

const listDokumen = catchAsync(async (req, res) => {
  await pesertaService.getPesertaById(req.params.id);
  const data = await pesertaService.listMyDokumen(req.params.id);
  sendResponse(res, 200, { message: 'Dokumen fetched', data });
});

const grafikTahunan = catchAsync(async (req, res) => {
  const data = await pesertaService.getGrafikTahunan({
    dariTanggal: req.query.dariTanggal || undefined,
    sampaiTanggal: req.query.sampaiTanggal || undefined,
  });
  sendResponse(res, 200, { message: 'Grafik tahunan fetched', data });
});

const dashboard = catchAsync(async (req, res) => {
  const data = await dashboardPmbService.getDashboard({ tahunPmbId: req.query.tahunPmbId || undefined });
  sendResponse(res, 200, { message: 'Dashboard PMB fetched', data });
});

const saveTarget = catchAsync(async (req, res) => {
  await dashboardPmbService.saveTarget(req.body, req.user.id);
  sendResponse(res, 200, { message: 'Target PMB disimpan' });
});

module.exports = {
  dashboard,
  saveTarget,
  grafikTahunan,
  list,
  detail,
  register,
  create,
  update,
  remove,
  login,
  forgotPassword,
  resetPassword,
  me,
  updateMe,
  saveBiodata,
  saveBiodataAdmin,
  setBiodataLock,
  removeBiodata,
  listMyDokumen,
  uploadMyDokumen,
  removeMyDokumen,
  listDokumen,
  getMyDataPmb,
  saveMyDataPmb,
  listMyTesUjian,
  mulaiMyTesUjian,
  simpanJawabanMyTesUjian,
  kirimMyTesUjian,
  gantiPassword,
  resetPasswordDefault,
};
