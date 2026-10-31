const Joi = require('joi');

// Kelas = 1 huruf (A, B, C, ...); waktu = P (Pagi) / M (Malam) — membentuk nama kelas mis. TI1AP.
const setKelas = Joi.object({
  mahasiswaIds: Joi.array().items(Joi.number().integer()).min(1).unique().required(),
  kelas: Joi.string()
    .pattern(/^[A-Za-z]$/)
    .required()
    .messages({ 'string.pattern.base': 'Kelas harus satu huruf (A-Z)' }),
  waktu: Joi.string().valid('P', 'M').required(),
});

const generatePerKelas = Joi.object({
  tahunAjaranId: Joi.number().integer().required(),
  namaKelas: Joi.string().max(30).required(),
});

module.exports = { setKelas, generatePerKelas };
