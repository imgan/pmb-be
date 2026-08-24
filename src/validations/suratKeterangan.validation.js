const Joi = require('joi');

const JENIS_SURAT_VALUES = [
  'AKTIF_KULIAH',
  'LULUS_MENUNGGU_IJAZAH',
  'OBSERVASI',
  'KKP',
  'REKOMENDASI_KAMPUS_MERDEKA',
  'UJIAN_UAS',
];

const commonFields = {
  nomorSurat: Joi.string().max(100).allow('', null),
  semester: Joi.number().integer().min(1).max(20).allow(null),
  alasan: Joi.string().allow('', null),
  namaInstansi: Joi.string().max(255).allow('', null),
  alamatInstansi: Joi.string().allow('', null),
  ipk: Joi.number().min(0).max(4).allow(null),
  jumlahSks: Joi.number().integer().min(0).allow(null),
  namaKoordinator: Joi.string().max(150).allow('', null),
  noHpKoordinator: Joi.string().max(30).allow('', null),
  tanggalUjianMulai: Joi.date().allow(null),
  tanggalUjianSelesai: Joi.date().allow(null),
};

const createSurat = Joi.object({
  mahasiswaId: Joi.number().integer().required(),
  jenisSurat: Joi.string().valid(...JENIS_SURAT_VALUES).required(),
  tanggalInput: Joi.date().required(),
  ...commonFields,
});

const updateSurat = Joi.object({
  mahasiswaId: Joi.number().integer(),
  jenisSurat: Joi.string().valid(...JENIS_SURAT_VALUES),
  tanggalInput: Joi.date(),
  ...commonFields,
}).min(1);

module.exports = { createSurat, updateSurat, JENIS_SURAT_VALUES };
