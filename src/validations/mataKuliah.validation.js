const Joi = require('joi');

const createMataKuliah = Joi.object({
  kodeMk: Joi.string().max(30).required(),
  namaMk: Joi.string().max(150).required(),
  sks: Joi.number().integer().min(0).required(),
});

const updateMataKuliah = Joi.object({
  kodeMk: Joi.string().max(30),
  namaMk: Joi.string().max(150),
  sks: Joi.number().integer().min(0),
}).min(1);

module.exports = { createMataKuliah, updateMataKuliah };
