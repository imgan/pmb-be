const Joi = require('joi');

const createPembayaranWisuda = Joi.object({
  nim: Joi.string().max(30).required(),
  tanggalBayar: Joi.date().required(),
  noBukti: Joi.string().max(50).required(),
  semester: Joi.number().integer().allow(null),
  periode: Joi.string().max(20).required(),
  bayar: Joi.number().min(0).required(),
  kodeBank: Joi.string().max(30).allow(null, ''),
});

module.exports = { createPembayaranWisuda };
