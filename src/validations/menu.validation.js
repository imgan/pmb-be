const Joi = require('joi');

const createMenu = Joi.object({
  parentId: Joi.number().integer().allow(null),
  name: Joi.string().max(100).required(),
  code: Joi.string().max(50).uppercase().required(),
  path: Joi.string().max(150).allow('', null),
  icon: Joi.string().max(50).allow('', null),
  orderNumber: Joi.number().integer().default(0),
  isActive: Joi.boolean(),
  isPublic: Joi.boolean(),
  module: Joi.string().valid('pmb', 'baak', 'sdi', 'prodi'),
});

const updateMenu = Joi.object({
  parentId: Joi.number().integer().allow(null),
  name: Joi.string().max(100),
  code: Joi.string().max(50).uppercase(),
  path: Joi.string().max(150).allow('', null),
  icon: Joi.string().max(50).allow('', null),
  orderNumber: Joi.number().integer(),
  isActive: Joi.boolean(),
  isPublic: Joi.boolean(),
  module: Joi.string().valid('pmb', 'baak', 'sdi', 'prodi'),
}).min(1);

module.exports = { createMenu, updateMenu };
