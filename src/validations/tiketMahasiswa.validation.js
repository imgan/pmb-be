const Joi = require('joi');

const JENIS = ['PERANGKAT_KOMPUTER', 'JARINGAN_INTERNET', 'SISTEM_INFORMASI', 'KEBUTUHAN_DATA', 'LAIN_LAIN'];

/** Pengajuan tiket oleh mahasiswa (portal). */
const createTiket = Joi.object({
  jenisKebutuhan: Joi.string().valid(...JENIS).required().messages({ 'any.only': 'Jenis kebutuhan tidak valid', 'any.required': 'Pilih jenis kebutuhan' }),
  uraian: Joi.string().trim().min(5).max(2000).required().messages({ 'string.min': 'Uraian kendala minimal 5 karakter' }),
});

/** Tanggapan petugas SIM. */
const tanggapiTiket = Joi.object({
  status: Joi.string().valid('BARU', 'DIPROSES', 'SELESAI', 'DITOLAK').required(),
  tanggapan: Joi.string().trim().max(2000).allow('', null),
});

module.exports = { createTiket, tanggapiTiket, JENIS };
