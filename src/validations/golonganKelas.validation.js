const Joi = require('joi');

const createGolonganKelas = Joi.object({
  namaKelas: Joi.string().max(100).required(),
});

const updateGolonganKelas = Joi.object({
  namaKelas: Joi.string().max(100),
}).min(1);

module.exports = { createGolonganKelas, updateGolonganKelas };
