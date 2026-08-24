const Joi = require('joi');

const saveKonversi = Joi.object({
  dariKurikulumId: Joi.number().integer().required(),
  keKurikulumId: Joi.number().integer().allow(null),
});

module.exports = { saveKonversi };
