const Joi = require('joi');

const createDaftarPotongan = Joi.object({
  nim: Joi.string().max(30).required(),
  biaya: Joi.number().min(0).required(),
  semester: Joi.number().integer().min(1).max(20).allow(null),
  alasan: Joi.string().allow(null, ''),
  asal: Joi.string().max(100).allow(null, ''),
});

const importDaftarPotongan = Joi.object({
  file: Joi.string().required(),
});

module.exports = { createDaftarPotongan, importDaftarPotongan };
