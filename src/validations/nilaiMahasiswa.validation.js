const Joi = require('joi');

const updateNilaiEntry = Joi.object({
  partisipatif: Joi.number().min(0).max(100),
  proyek: Joi.number().min(0).max(100),
  quiz: Joi.number().min(0).max(100),
  tugas: Joi.number().min(0).max(100),
  uts: Joi.number().min(0).max(100),
  uas: Joi.number().min(0).max(100),
}).min(1);

const importNilai = Joi.object({
  file: Joi.string().required(),
});

module.exports = { updateNilaiEntry, importNilai };
