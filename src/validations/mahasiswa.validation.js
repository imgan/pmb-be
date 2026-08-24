const Joi = require('joi');

const updateMahasiswa = Joi.object({
  nim: Joi.string().max(30),
  namaLengkap: Joi.string().max(150),
  email: Joi.string().email(),
  noTelepon: Joi.string().max(20).allow(null, ''),
  asalSekolah: Joi.string().max(150).allow(null, ''),
  alamat: Joi.string().allow(null, ''),
  golonganKelasId: Joi.number().integer(),
  jurusanId: Joi.number().integer(),
  tahunMasuk: Joi.number().integer().min(2000).max(2100),
  tahunAjaranId: Joi.number().integer().allow(null),
  statusMasuk: Joi.string().valid('BARU', 'TRANSFER_LUAR', 'TRANSFER_DALAM', 'TRANSFER_LUAR_KARYAWAN', 'TRANSFER_DALAM_KARYAWAN'),
  isActive: Joi.boolean(),
  statusKeluar: Joi.string()
    .valid('CUTI', 'MENGUNDURKAN_DIRI', 'DROP_OUT', 'HABIS_MASA_STUDI', 'MUTASI', 'PUTUS_SEKOLAH', 'WAFAT', 'HILANG', 'LAINNYA')
    .allow(null),
  tanggalKeluar: Joi.date().allow(null),
  alasanKeluar: Joi.string().allow('', null),
}).min(1);

const generateMahasiswa = Joi.object({
  tahunAjaranId: Joi.number().integer().required(),
  jurusanPrefixes: Joi.object()
    .pattern(
      Joi.string().pattern(/^\d+$/),
      Joi.string()
        .trim()
        .uppercase()
        .pattern(/^[A-Z0-9]{1,10}$/)
        .messages({ 'string.pattern.base': 'Prefix hanya boleh berisi huruf/angka, maksimal 10 karakter' })
    )
    .min(1)
    .required()
    .messages({ 'object.min': 'Prefix NIM per jurusan wajib diisi' }),
  pesertaIds: Joi.array().items(Joi.number().integer()).min(1),
});

const importMahasiswa = Joi.object({
  file: Joi.string().required(),
});

module.exports = {
  updateMahasiswa,
  generateMahasiswa,
  importMahasiswa,
};
