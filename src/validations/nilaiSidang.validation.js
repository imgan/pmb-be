const Joi = require('joi');
const { PERAN_LIST } = require('../services/nilaiSidang.service');

const saveNilaiSidang = Joi.object({
  peran: Joi.string()
    .valid(...PERAN_LIST)
    .required(),
  nilai: Joi.number().min(0).max(100).required(),
});

module.exports = { saveNilaiSidang };
