const Joi = require('joi');

const createUkuranAlmamater = Joi.object({
  ukuran: Joi.string().max(50).required(),
});

const updateUkuranAlmamater = Joi.object({
  ukuran: Joi.string().max(50),
}).min(1);

module.exports = { createUkuranAlmamater, updateUkuranAlmamater };
