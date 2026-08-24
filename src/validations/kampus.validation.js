const Joi = require('joi');

const updateKampus = Joi.object({
  namaKampus: Joi.string().max(150),
  alamat: Joi.string().max(1000).allow('', null),
  telepon: Joi.string().max(30).allow('', null),
  kodePos: Joi.string().max(10).allow('', null),
  email: Joi.string().email().allow('', null),
  whatsappNumber: Joi.string().max(30).allow('', null),
  facebookUrl: Joi.string().uri().max(255).allow('', null),
  instagramUrl: Joi.string().uri().max(255).allow('', null),
  youtubeUrl: Joi.string().uri().max(255).allow('', null),
  logoUrl: Joi.string().allow('', null),
  faviconUrl: Joi.string().allow('', null),
  websiteTitle: Joi.string().max(150).allow('', null),
}).min(1);

module.exports = { updateKampus };
