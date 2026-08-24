const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const authService = require('../services/auth.service');

const login = catchAsync(async (req, res) => {
  const { username, password } = req.body;
  const result = await authService.login(username, password);
  sendResponse(res, 200, { message: 'Login successful', data: result });
});

const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.body;
  const result = await authService.refresh(token);
  sendResponse(res, 200, { message: 'Token refreshed', data: result });
});

const me = catchAsync(async (req, res) => {
  const result = await authService.getMe(req.user.id);
  sendResponse(res, 200, { message: 'Current user fetched', data: result });
});

const forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  sendResponse(res, 200, { message: 'Jika email terdaftar, link reset password telah dikirim' });
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  sendResponse(res, 200, { message: 'Password berhasil direset, silakan login dengan password baru' });
});

const changePassword = catchAsync(async (req, res) => {
  await authService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
  sendResponse(res, 200, { message: 'Password berhasil diubah' });
});

const updateProfile = catchAsync(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);
  sendResponse(res, 200, { message: 'Profil berhasil diperbarui', data: { user } });
});

module.exports = { login, refreshToken, me, forgotPassword, resetPassword, changePassword, updateProfile };
