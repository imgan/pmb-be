const Joi = require('joi');

const createSumberInformasi = Joi.object({
  namaInformasi: Joi.string().max(150).required(),
});

const updateSumberInformasi = Joi.object({
  namaInformasi: Joi.string().max(150),
}).min(1);

module.exports = { createSumberInformasi, updateSumberInformasi };
