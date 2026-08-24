const Joi = require('joi');

const createJadwalSidang = Joi.object({
  tahunAjaranId: Joi.number().integer().required(),
  semester: Joi.string().valid('GANJIL', 'GENAP').required(),
  jurusanId: Joi.number().integer().required(),
  tanggal: Joi.date().required(),
  jam: Joi.string().max(30).required(),
  ruangan: Joi.string().max(100).allow('', null),
  noSk: Joi.string().max(100).allow('', null),
  dosenPengujiId: Joi.number().integer().allow(null),
});

const updateJadwalSidang = Joi.object({
  tahunAjaranId: Joi.number().integer(),
  semester: Joi.string().valid('GANJIL', 'GENAP'),
  jurusanId: Joi.number().integer(),
  tanggal: Joi.date(),
  jam: Joi.string().max(30),
  ruangan: Joi.string().max(100).allow('', null),
  noSk: Joi.string().max(100).allow('', null),
  dosenPengujiId: Joi.number().integer().allow(null),
}).min(1);

module.exports = { createJadwalSidang, updateJadwalSidang };
