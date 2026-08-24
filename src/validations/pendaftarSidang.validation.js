const Joi = require('joi');

const createPendaftarSidang = Joi.object({
  mahasiswaId: Joi.number().integer().required(),
  jadwalSidangId: Joi.number().integer().allow(null),
  judul: Joi.string().required(),
  pembimbing1Id: Joi.number().integer().allow(null),
  pembimbing2Id: Joi.number().integer().allow(null),
});

const updatePendaftarSidang = Joi.object({
  mahasiswaId: Joi.number().integer(),
  jadwalSidangId: Joi.number().integer().allow(null),
  judul: Joi.string(),
  pembimbing1Id: Joi.number().integer().allow(null),
  pembimbing2Id: Joi.number().integer().allow(null),
}).min(1);

module.exports = { createPendaftarSidang, updatePendaftarSidang };
