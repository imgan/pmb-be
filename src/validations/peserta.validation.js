const Joi = require('joi');

const registerPeserta = Joi.object({
  namaLengkap: Joi.string().max(150).required(),
  asalSekolah: Joi.string().max(150).required(),
  golonganKelasId: Joi.number().integer().required(),
  jurusanId: Joi.number().integer().required(),
  noTelepon: Joi.string().max(20).required(),
  email: Joi.string().email().required(),
});

const createPeserta = registerPeserta.keys({
  isActive: Joi.boolean(),
});

const updatePeserta = Joi.object({
  namaLengkap: Joi.string().max(150),
  asalSekolah: Joi.string().max(150),
  golonganKelasId: Joi.number().integer(),
  jurusanId: Joi.number().integer(),
  noTelepon: Joi.string().max(20),
  email: Joi.string().email(),
  isActive: Joi.boolean(),
  statusUjian: Joi.string().valid('belum_ujian', 'lulus', 'tidak_lulus'),
  statusKelulusan: Joi.string().valid('menunggu', 'diterima', 'ditolak'),
}).min(1);

const loginPeserta = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotPasswordPeserta = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordPeserta = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).required(),
});

const updateMyProfile = Joi.object({
  namaLengkap: Joi.string().max(150),
  asalSekolah: Joi.string().max(150),
  golonganKelasId: Joi.number().integer(),
  jurusanId: Joi.number().integer(),
  noTelepon: Joi.string().max(20),
  email: Joi.string().email(),
}).min(1);

const saveBiodata = Joi.object({
  tempatLahir: Joi.string().max(100).required(),
  tanggalLahir: Joi.date().iso().required(),
  jenisKelamin: Joi.string().valid('L', 'P').required(),
  agama: Joi.string().max(50).required(),
  kewarganegaraan: Joi.string().max(50).required(),
  nik: Joi.string()
    .pattern(/^\d{16}$/)
    .required()
    .messages({ 'string.pattern.base': 'NIK must be exactly 16 digits' }),
  namaIbuKandung: Joi.string().max(150).required(),
  jalan: Joi.string().max(255).required(),
  rt: Joi.string().max(3).required(),
  rw: Joi.string().max(3).required(),
  desaKelurahan: Joi.string().max(100).required(),
  provinsi: Joi.string().max(100).required(),
  kabupaten: Joi.string().max(100).required(),
  kecamatan: Joi.string().max(100).required(),
  kodePos: Joi.string().max(10).required(),
  noWhatsapp: Joi.string().max(20).required(),
  isAgree: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must agree to the statement before saving your data',
  }),
});

module.exports = {
  registerPeserta,
  createPeserta,
  updatePeserta,
  loginPeserta,
  forgotPasswordPeserta,
  resetPasswordPeserta,
  updateMyProfile,
  saveBiodata,
};
