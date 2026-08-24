const Joi = require('joi');

const bayarVocUjianFtid = Joi.object({
  nominal: Joi.number().min(0).required(),
});

module.exports = { bayarVocUjianFtid };
