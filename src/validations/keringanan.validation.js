const Joi = require('joi');

const STATUS_OPTIONS = ['DIAJUKAN', 'DISETUJUI', 'DITOLAK'];

const createKeringanan = Joi.object({
  nim: Joi.string().max(30).required(),
  tanggal: Joi.date().required(),
  jumlahBayar: Joi.number().min(0).required(),
  alasan: Joi.string().allow(null, ''),
  status: Joi.string().valid(...STATUS_OPTIONS),
});

const updateKeringanan = Joi.object({
  nim: Joi.string().max(30),
  tanggal: Joi.date(),
  jumlahBayar: Joi.number().min(0),
  alasan: Joi.string().allow(null, ''),
  status: Joi.string().valid(...STATUS_OPTIONS),
}).min(1);

module.exports = { createKeringanan, updateKeringanan };
