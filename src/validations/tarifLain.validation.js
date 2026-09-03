const Joi = require('joi');

const createTarifLain = Joi.object({
  kodeBiaya: Joi.string().max(30).required(),
  tahunMasuk: Joi.number().integer().required(),
  biaya: Joi.number().min(0).required(),
  keterangan: Joi.string().max(150).allow(null, ''),
  isActive: Joi.boolean(),
});

const updateTarifLain = Joi.object({
  kodeBiaya: Joi.string().max(30),
  tahunMasuk: Joi.number().integer(),
  biaya: Joi.number().min(0),
  keterangan: Joi.string().max(150).allow(null, ''),
  isActive: Joi.boolean(),
}).min(1);

const importTarifLain = Joi.object({
  file: Joi.string().required(),
});

module.exports = { createTarifLain, updateTarifLain, importTarifLain };
