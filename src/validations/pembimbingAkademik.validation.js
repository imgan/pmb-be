const Joi = require('joi');

const createPembimbingAkademik = Joi.object({
  dosenId: Joi.number().integer().required(),
  noSk: Joi.string().max(100).allow('', null),
  tanggalSk: Joi.date().allow(null),
});

const updatePembimbingAkademik = Joi.object({
  dosenId: Joi.number().integer(),
  noSk: Joi.string().max(100).allow('', null),
  tanggalSk: Joi.date().allow(null),
}).min(1);

module.exports = { createPembimbingAkademik, updatePembimbingAkademik };
