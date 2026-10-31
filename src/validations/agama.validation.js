const Joi = require('joi');

const createAgama = Joi.object({
  kodeAgama: Joi.string().trim().max(10).required(),
  namaAgama: Joi.string().trim().max(50).required(),
});

const updateAgama = Joi.object({
  kodeAgama: Joi.string().trim().max(10),
  namaAgama: Joi.string().trim().max(50),
}).min(1);

module.exports = { createAgama, updateAgama };
