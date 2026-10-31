const Joi = require('joi');

// Rentang jam "HH:MM-HH:MM"; kosong/null = tidak bersedia hari itu.
const rentangJam = Joi.string()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/)
  .allow('', null)
  .messages({ 'string.pattern.base': 'Format jam harus HH:MM-HH:MM' });

const saveKesediaan = Joi.object({
  mataKuliahId: Joi.number().integer().required().messages({ 'any.required': 'Matakuliah wajib dipilih' }),
  senin: rentangJam,
  selasa: rentangJam,
  rabu: rentangJam,
  kamis: rentangJam,
  jumat: rentangJam,
  sabtu: rentangJam,
  minggu: rentangJam,
});

module.exports = { saveKesediaan };
