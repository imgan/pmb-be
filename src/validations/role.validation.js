const Joi = require('joi');

const createRole = Joi.object({
  name: Joi.string().max(100).required(),
  code: Joi.string().max(50).uppercase().required(),
  description: Joi.string().max(255).allow('', null),
  isActive: Joi.boolean(),
});

const updateRole = Joi.object({
  name: Joi.string().max(100),
  code: Joi.string().max(50).uppercase(),
  description: Joi.string().max(255).allow('', null),
  isActive: Joi.boolean(),
}).min(1);

module.exports = { createRole, updateRole };
