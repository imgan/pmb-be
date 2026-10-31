const Joi = require('joi');

// Minimal persen yang sudah dibayar (0–100) per jenis cekal.
const updateBatasTagihanAkademik = Joi.object({
  krsAktif: Joi.boolean(),
  minBayarKrs: Joi.number().min(0).max(100),
  utsAktif: Joi.boolean(),
  minBayarUts: Joi.number().min(0).max(100),
  nilaiAktif: Joi.boolean(),
  minBayarNilai: Joi.number().min(0).max(100),
}).min(1);

module.exports = { updateBatasTagihanAkademik };
