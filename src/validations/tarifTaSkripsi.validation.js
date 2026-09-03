const Joi = require('joi');

const createTarifTaSkripsi = Joi.object({
  periode: Joi.number().integer().required(),
  jurusanId: Joi.number().integer().required(),
  biayaPendaftaran: Joi.number().min(0).required(),
  biayaPerpanjangan: Joi.number().min(0),
  isActive: Joi.boolean(),
});

const updateTarifTaSkripsi = Joi.object({
  periode: Joi.number().integer(),
  jurusanId: Joi.number().integer(),
  biayaPendaftaran: Joi.number().min(0),
  biayaPerpanjangan: Joi.number().min(0),
  isActive: Joi.boolean(),
}).min(1);

const importTarifTaSkripsi = Joi.object({
  file: Joi.string().required(),
});

module.exports = { createTarifTaSkripsi, updateTarifTaSkripsi, importTarifTaSkripsi };
