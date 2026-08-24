const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const pesertaService = require('../services/peserta.service');

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
      ? 'Registrasi berhasil, password telah dikirim ke email Anda'
      : 'Registrasi berhasil, namun pengiriman email gagal. Silakan hubungi admin',
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
  const { email, password } = req.body;
  const data = await pesertaService.loginPeserta(email, password);
  sendResponse(res, 200, { message: 'Login successful', data });
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

module.exports = {
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
  listMyDokumen,
  uploadMyDokumen,
  removeMyDokumen,
};
