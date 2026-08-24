const Joi = require('joi');

const createUser = Joi.object({
  name: Joi.string().max(100).required(),
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  roleId: Joi.number().integer().required(),
  isActive: Joi.boolean(),
});

const updateUser = Joi.object({
  name: Joi.string().max(100),
  email: Joi.string().email(),
  password: Joi.string().min(8),
  roleId: Joi.number().integer(),
  isActive: Joi.boolean(),
}).min(1);

module.exports = { createUser, updateUser };
