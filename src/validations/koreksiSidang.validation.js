const Joi = require('joi');
const { PERAN_LIST } = require('../services/nilaiSidang.service');

const createKoreksiSidang = Joi.object({
  peran: Joi.string()
    .valid(...PERAN_LIST)
    .required(),
  babHalaman: Joi.string().max(100).allow('', null),
  uraian: Joi.string().trim().min(1).required(),
  isSelesai: Joi.boolean(),
});

const updateKoreksiSidang = Joi.object({
  babHalaman: Joi.string().max(100).allow('', null),
  uraian: Joi.string().trim().min(1),
  isSelesai: Joi.boolean(),
}).min(1);

module.exports = { createKoreksiSidang, updateKoreksiSidang };
