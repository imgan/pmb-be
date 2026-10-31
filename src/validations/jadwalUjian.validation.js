const Joi = require('joi');

// Isian jadwal ujian per kelas: kelas/ruangan/jam/pengawas mengikuti jadwal kuliah dari BAAK.
const simpanJadwalUjian = Joi.object({
  jenisUjian: Joi.string().valid('UTS', 'UAS').required().messages({ 'any.required': 'Jenis ujian wajib dipilih' }),
  status: Joi.string().valid('ONLINE', 'OFFLINE').allow('', null),
  sifat: Joi.string().trim().max(30).allow('', null),
  tanggal: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow('', null)
    .messages({ 'string.pattern.base': 'Tanggal ujian tidak valid' }),
});

module.exports = { simpanJadwalUjian };
