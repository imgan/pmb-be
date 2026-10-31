const Joi = require('joi');

const registerPeserta = Joi.object({
  namaLengkap: Joi.string().max(150).required(),
  asalSekolah: Joi.string().max(150).required(),
  golonganKelasId: Joi.number().integer().required(),
  jurusanId: Joi.number().integer().required(),
  noTelepon: Joi.string().max(20).required(),
  email: Joi.string().email().required(),
  sumberInformasiId: Joi.number().integer().allow(null),
  beasiswaId: Joi.number().integer().allow(null),
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
  sumberInformasiId: Joi.number().integer().allow(null),
  beasiswaId: Joi.number().integer().allow(null),
  isActive: Joi.boolean(),
  statusUjian: Joi.string().valid('belum_ujian', 'lulus', 'tidak_lulus'),
  statusKelulusan: Joi.string().valid('menunggu', 'diterima', 'ditolak'),
}).min(1);

// username = nomor HP atau email; `email` tetap diterima demi kompatibilitas klien lama.
const loginPeserta = Joi.object({
  username: Joi.string().max(100),
  email: Joi.string().max(100),
  password: Joi.string().required(),
})
  .or('username', 'email')
  .messages({ 'object.missing': 'Nomor HP atau email wajib diisi' });

const gantiPassword = Joi.object({
  passwordLama: Joi.string().required(),
  passwordBaru: Joi.string().min(8).required().messages({ 'string.min': 'Password baru minimal 8 karakter' }),
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
  sumberInformasiId: Joi.number().integer().allow(null),
  beasiswaId: Joi.number().integer().allow(null),
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
  // Nama ibu kandung & alamat opsional (kosong disimpan sebagai '').
  namaIbuKandung: Joi.string().max(150).allow('').empty(null).default(''),
  jalan: Joi.string().max(255).allow('').empty(null).default(''),
  rt: Joi.string().max(3).allow('').empty(null).default(''),
  rw: Joi.string().max(3).allow('').empty(null).default(''),
  desaKelurahan: Joi.string().max(100).allow('').empty(null).default(''),
  provinsi: Joi.string().max(100).allow('').empty(null).default(''),
  kabupaten: Joi.string().max(100).allow('').empty(null).default(''),
  kecamatan: Joi.string().max(100).allow('').empty(null).default(''),
  kodePos: Joi.string().max(10).allow('').empty(null).default(''),
  noWhatsapp: Joi.string().max(20).required(),
  jurusanSekolah: Joi.string().max(100).allow('', null),
  tahunLulus: Joi.string().pattern(/^\d{4}$/).allow('', null).messages({ 'string.pattern.base': 'Tahun lulus harus 4 digit' }),
  jenisPengelolaanSekolah: Joi.string().valid('negeri', 'swasta').allow('', null),
  alamatSekolah: Joi.string().max(255).allow('', null),
  nisn: Joi.string().pattern(/^\d{10}$/).allow('', null).messages({ 'string.pattern.base': 'NISN harus 10 digit angka' }),
  isAgree: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must agree to the statement before saving your data',
  }),
});

// Admin mengisi/mengubah biodata atas nama peserta: pernyataan persetujuan tidak wajib.
const saveBiodataAdmin = saveBiodata.keys({ isAgree: Joi.boolean() });

const setBiodataLock = Joi.object({ isLocked: Joi.boolean().required() });

const saveTargetPmb = Joi.object({
  tahunPmbId: Joi.number().integer().required(),
  items: Joi.array()
    .items(Joi.object({ kodeProdi: Joi.string().max(20).required(), target: Joi.number().integer().min(0).allow(null) }))
    .min(1)
    .required(),
});

// Form pendaftaran publik: biodata lengkap boleh dikirim sekaligus (opsional demi klien lama).
const registerPesertaDenganBiodata = registerPeserta.keys({ biodata: saveBiodata });

module.exports = {
  saveBiodataAdmin,
  setBiodataLock,
  saveTargetPmb,
  registerPeserta: registerPesertaDenganBiodata,
  // Admin: akun peserta baru beserta biodata (opsional) dari form Tambah Peserta.
  createPeserta: createPeserta.keys({ biodata: saveBiodataAdmin }),
  updatePeserta,
  loginPeserta,
  forgotPasswordPeserta,
  resetPasswordPeserta,
  updateMyProfile,
  saveBiodata,
  gantiPassword,
};
