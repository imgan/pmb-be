const Joi = require('joi');

const login = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
  // Konteks sesi: tahun akademik acuan, modul yang dipilih, dan prodi (khusus modul Prodi).
  tahunAjaranId: Joi.number().integer().allow(null),
  module: Joi.string().max(30).allow(null, ''),
  kodeProdi: Joi.string().max(20).allow(null, ''),
});

const refreshToken = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPassword = Joi.object({
  email: Joi.string().email().required(),
});

const resetPassword = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).required(),
});

const changePassword = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

const updateProfile = Joi.object({
  name: Joi.string().max(100),
  photo: Joi.string().allow('', null),
}).min(1);

module.exports = { login, refreshToken, forgotPassword, resetPassword, changePassword, updateProfile };
