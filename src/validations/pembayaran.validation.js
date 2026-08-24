const Joi = require('joi');

const createPembayaran = Joi.object({
  namaPembayaran: Joi.string().max(150).required(),
  isBeasiswa: Joi.boolean(),
});

const updatePembayaran = Joi.object({
  namaPembayaran: Joi.string().max(150),
  isBeasiswa: Joi.boolean(),
}).min(1);

module.exports = { createPembayaran, updatePembayaran };
