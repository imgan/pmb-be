const Joi = require('joi');

/** Catatan konsultasi bimbingan TA/Skripsi (portal dosen). */
const catatanBimbingan = Joi.object({
  tanggal: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({ 'string.pattern.base': 'Tanggal tidak valid', 'any.required': 'Tanggal wajib diisi' }),
  pokokPembahasan: Joi.string().trim().min(3).max(2000).required().messages({ 'any.required': 'Pokok pembahasan wajib diisi' }),
  keterangan: Joi.string().trim().max(2000).allow('', null),
});

module.exports = { catatanBimbingan };
