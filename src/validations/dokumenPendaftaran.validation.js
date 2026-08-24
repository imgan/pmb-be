const Joi = require('joi');

const createDokumenPendaftaran = Joi.object({
  namaPendaftaran: Joi.string().max(150).required(),
  isWajib: Joi.boolean(),
});

const updateDokumenPendaftaran = Joi.object({
  namaPendaftaran: Joi.string().max(150),
  isWajib: Joi.boolean(),
}).min(1);

module.exports = { createDokumenPendaftaran, updateDokumenPendaftaran };
