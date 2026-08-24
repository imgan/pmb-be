const Joi = require('joi');

const updateYudisium = Joi.object({
  noSk: Joi.string().max(100).allow('', null),
  tanggalSk: Joi.date().allow(null),
  tanggalYudisium: Joi.date().allow(null),
  pin: Joi.string().max(50).allow('', null),
  judul: Joi.string().allow('', null),
  pembimbing1Id: Joi.number().integer().allow(null),
  pembimbing2Id: Joi.number().integer().allow(null),
}).min(1);

module.exports = { updateYudisium };
