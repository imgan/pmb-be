const Joi = require('joi');

const createTahunAjaran = Joi.object({
  nama: Joi.string().max(20).required(),
  tahunMulai: Joi.number().integer().min(2000).max(2100).required(),
  tahunSelesai: Joi.number().integer().min(2000).max(2100).required(),
  isActive: Joi.boolean(),
});

const updateTahunAjaran = Joi.object({
  nama: Joi.string().max(20),
  tahunMulai: Joi.number().integer().min(2000).max(2100),
  tahunSelesai: Joi.number().integer().min(2000).max(2100),
  isActive: Joi.boolean(),
}).min(1);

module.exports = { createTahunAjaran, updateTahunAjaran };
