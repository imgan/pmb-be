const Joi = require('joi');

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const createBiayaKuliah = Joi.object({
  judul: Joi.string().max(150).required(),
  slug: Joi.string().max(150).pattern(slugPattern).required().messages({
    'string.pattern.base': 'Slug hanya boleh huruf kecil, angka, dan tanda strip (mis. biaya-kuliah-2026)',
  }),
  ringkasan: Joi.string().max(500).allow('', null),
  konten: Joi.string().allow('', null),
  orderNumber: Joi.number().integer(),
  isActive: Joi.boolean(),
});

const updateBiayaKuliah = Joi.object({
  judul: Joi.string().max(150),
  slug: Joi.string().max(150).pattern(slugPattern).messages({
    'string.pattern.base': 'Slug hanya boleh huruf kecil, angka, dan tanda strip (mis. biaya-kuliah-2026)',
  }),
  ringkasan: Joi.string().max(500).allow('', null),
  konten: Joi.string().allow('', null),
  orderNumber: Joi.number().integer(),
  isActive: Joi.boolean(),
}).min(1);

module.exports = { createBiayaKuliah, updateBiayaKuliah };
