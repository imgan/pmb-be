const Joi = require('joi');

const generateTagihan = Joi.object({
  tahunAjaranId: Joi.number().integer().required(),
});

module.exports = { generateTagihan };
