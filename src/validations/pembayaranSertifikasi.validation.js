const Joi = require('joi');

const CARA_PEMBAYARAN_OPTIONS = ['Tunai', 'Transfer Bank', 'EDC/Kartu'];
const STATUS_SERTIFIKASI_OPTIONS = ['MENUNGGU', 'LULUS', 'TIDAK_LULUS'];
const FILE_PATTERN = /^data:(application\/pdf|image\/png|image\/jpeg);base64,/;

const createPembayaranSertifikasi = Joi.object({
  nim: Joi.string().max(30).required(),
  tanggalBayar: Joi.date().required(),
  noBukti: Joi.string().max(50).required(),
  jenisPembayaran: Joi.string().max(100).required(),
  caraPembayaran: Joi.string()
    .valid(...CARA_PEMBAYARAN_OPTIONS)
    .required(),
  tanggalPelaksanaan: Joi.date().allow(null, ''),
  waktuPelaksanaan: Joi.string().max(20).allow(null, ''),
  bayar: Joi.number().min(0).required(),
  kodeBank: Joi.string().max(30).allow(null, ''),
  keterangan: Joi.string().max(150).allow(null, ''),
  statusSertifikasi: Joi.string().valid(...STATUS_SERTIFIKASI_OPTIONS),
  buktiPembayaran: Joi.string()
    .pattern(FILE_PATTERN)
    .allow(null, '')
    .messages({ 'string.pattern.base': 'Bukti pembayaran harus berformat PDF, PNG, atau JPEG' }),
});

const updatePembayaranSertifikasi = Joi.object({
  nim: Joi.string().max(30),
  tanggalBayar: Joi.date(),
  noBukti: Joi.string().max(50),
  jenisPembayaran: Joi.string().max(100),
  caraPembayaran: Joi.string().valid(...CARA_PEMBAYARAN_OPTIONS),
  tanggalPelaksanaan: Joi.date().allow(null, ''),
  waktuPelaksanaan: Joi.string().max(20).allow(null, ''),
  bayar: Joi.number().min(0),
  kodeBank: Joi.string().max(30).allow(null, ''),
  keterangan: Joi.string().max(150).allow(null, ''),
  statusSertifikasi: Joi.string().valid(...STATUS_SERTIFIKASI_OPTIONS),
  buktiPembayaran: Joi.string()
    .pattern(FILE_PATTERN)
    .allow(null, '')
    .messages({ 'string.pattern.base': 'Bukti pembayaran harus berformat PDF, PNG, atau JPEG' }),
}).min(1);

module.exports = {
  createPembayaranSertifikasi,
  updatePembayaranSertifikasi,
  CARA_PEMBAYARAN_OPTIONS,
  STATUS_SERTIFIKASI_OPTIONS,
};
