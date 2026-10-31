const Joi = require('joi');

const saveKonversi = Joi.object({
  dariMataKuliahId: Joi.number().integer().required(),
  keMataKuliahId: Joi.number().integer().allow(null),
});

module.exports = { saveKonversi };
