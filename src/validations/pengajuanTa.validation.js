const Joi = require('joi');

// ---- Periode (prodi) ----
const periodeFields = {
  jurusanId: Joi.number().integer().allow(null),
  tanggalMulai: Joi.date().iso(),
  tanggalSelesai: Joi.date().iso(),
  keterangan: Joi.string().max(2000).allow('', null),
  isActive: Joi.boolean(),
};
const createPeriode = Joi.object({
  ...periodeFields,
  tanggalMulai: periodeFields.tanggalMulai.required(),
  tanggalSelesai: periodeFields.tanggalSelesai.required(),
});
const updatePeriode = Joi.object(periodeFields).min(1);

// ---- Pengajuan (mahasiswa) ----
const ajukanTa = Joi.object({
  noTelepon: Joi.string().trim().max(30).allow('', null),
  email: Joi.string().trim().email().max(150).allow('', null).messages({ 'string.email': 'Format email tidak valid' }),
  judul: Joi.string().trim().min(10).max(1000).required().messages({ 'string.min': 'Judul minimal 10 karakter' }),
  tempatKkp: Joi.string().trim().max(200).allow('', null),
  pembimbingUtamaId: Joi.number().integer().required().messages({ 'any.required': 'Pilih pembimbing utama' }),
  pembimbingPendampingId: Joi.number().integer().allow(null),
});

// ---- Verifikasi (prodi) ----
const verifikasiTa = Joi.object({
  status: Joi.string().valid('DIAJUKAN', 'DISETUJUI', 'DITOLAK').required(),
  catatanProdi: Joi.string().trim().max(2000).allow('', null),
  judul: Joi.string().trim().min(10).max(1000),
  pembimbingUtamaId: Joi.number().integer().allow(null),
  pembimbingPendampingId: Joi.number().integer().allow(null),
});

module.exports = { createPeriode, updatePeriode, ajukanTa, verifikasiTa };
