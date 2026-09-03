const Joi = require('joi');

const createHonorUjianPembayaran = Joi.object({
  dosenId: Joi.number().integer().required(),
  nominal: Joi.number().greater(0).required(),
});

module.exports = { createHonorUjianPembayaran };
