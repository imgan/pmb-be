const Joi = require('joi');

const createTarifPembimbing = Joi.object({
  periode: Joi.number().integer().required(),
  jurusanId: Joi.number().integer().required(),
  biayaPembimbingUtama: Joi.number().min(0).required(),
  biayaPembimbingPendamping: Joi.number().min(0),
  biayaPembimbingAsisten: Joi.number().min(0),
  biayaPembimbingTunggal: Joi.number().min(0),
  isActive: Joi.boolean(),
});

const updateTarifPembimbing = Joi.object({
  periode: Joi.number().integer(),
  jurusanId: Joi.number().integer(),
  biayaPembimbingUtama: Joi.number().min(0),
  biayaPembimbingPendamping: Joi.number().min(0),
  biayaPembimbingAsisten: Joi.number().min(0),
  biayaPembimbingTunggal: Joi.number().min(0),
  isActive: Joi.boolean(),
}).min(1);

const importTarifPembimbing = Joi.object({
  file: Joi.string().required(),
});

module.exports = { createTarifPembimbing, updateTarifPembimbing, importTarifPembimbing };
