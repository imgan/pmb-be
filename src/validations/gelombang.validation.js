const Joi = require('joi');

const createGelombang = Joi.object({
  namaGelombang: Joi.string().max(150).required(),
  tahunPmbId: Joi.number().integer().allow(null),
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required().messages({
    'date.min': 'endDate must be greater than or equal to startDate',
  }),
  deskripsi: Joi.string().allow('', null),
  status: Joi.string().valid('OTOMATIS', 'AKTIF', 'TIDAK_AKTIF'),
});

const updateGelombang = Joi.object({
  namaGelombang: Joi.string().max(150),
  tahunPmbId: Joi.number().integer().allow(null),
  startDate: Joi.date(),
  endDate: Joi.date(),
  deskripsi: Joi.string().allow('', null),
  status: Joi.string().valid('OTOMATIS', 'AKTIF', 'TIDAK_AKTIF'),
}).min(1);

module.exports = { createGelombang, updateGelombang };
