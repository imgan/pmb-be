const Joi = require('joi');

const pullFromMachine = Joi.object({
  file: Joi.string().required(),
});

module.exports = { pullFromMachine };
