const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const mahasiswaAuthService = require('../services/mahasiswaAuth.service');

const login = catchAsync(async (req, res) => {
  const data = await mahasiswaAuthService.loginMahasiswa(req.body);
  sendResponse(res, 200, { message: 'Login berhasil', data });
});

const me = catchAsync(async (req, res) => {
  const data = await mahasiswaAuthService.getProfile(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Profile fetched', data });
});

const updateProfile = catchAsync(async (req, res) => {
  const data = await mahasiswaAuthService.updateProfile(req.mahasiswa.id, req.body);
  sendResponse(res, 200, { message: 'Profil berhasil diperbarui', data });
});

const changePassword = catchAsync(async (req, res) => {
  await mahasiswaAuthService.changePassword(req.mahasiswa.id, req.body.oldPassword, req.body.newPassword);
  sendResponse(res, 200, { message: 'Password berhasil diubah' });
});

module.exports = { login, me, updateProfile, changePassword };
