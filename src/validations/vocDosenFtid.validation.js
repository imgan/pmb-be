const Joi = require('joi');

const updateVocUjianDosen = Joi.object({
  jumlah: Joi.number().integer().min(0),
  tanggalBerkas: Joi.date().allow(null),
  pengawasRealId: Joi.number().integer().allow(null),
}).min(1);

module.exports = { updateVocUjianDosen };
