const Joi = require('joi');

const createPembimbingTaSkripsi = Joi.object({
  dosenId: Joi.number().integer().required(),
  noSk: Joi.string().max(100).allow('', null),
  tanggalSk: Joi.date().allow(null),
  pembimbingKe: Joi.string().valid('UTAMA', 'PENDAMPING').required(),
  periodeMulai: Joi.date().required(),
  periodeSelesai: Joi.date().required(),
});

const updatePembimbingTaSkripsi = Joi.object({
  dosenId: Joi.number().integer(),
  noSk: Joi.string().max(100).allow('', null),
  tanggalSk: Joi.date().allow(null),
  pembimbingKe: Joi.string().valid('UTAMA', 'PENDAMPING'),
  periodeMulai: Joi.date(),
  periodeSelesai: Joi.date(),
}).min(1);

module.exports = { createPembimbingTaSkripsi, updatePembimbingTaSkripsi };
