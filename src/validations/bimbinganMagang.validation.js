const Joi = require('joi');

const createBimbinganMagang = Joi.object({
  mahasiswaId: Joi.number().integer().required(),
  pembimbingMagangId: Joi.number().integer().allow(null),
  judul: Joi.string().allow('', null),
  nilai: Joi.string().max(10).allow('', null),
  kelas: Joi.string().max(20).allow('', null),
});

const updateBimbinganMagang = Joi.object({
  mahasiswaId: Joi.number().integer(),
  pembimbingMagangId: Joi.number().integer().allow(null),
  judul: Joi.string().allow('', null),
  nilai: Joi.string().max(10).allow('', null),
  kelas: Joi.string().max(20).allow('', null),
}).min(1);

module.exports = { createBimbinganMagang, updateBimbinganMagang };
