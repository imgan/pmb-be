const Joi = require('joi');

// Menerima base64 murni atau data URI (data:<mime>;base64,<data>)
const base64File = Joi.string().pattern(/^(data:[\w./+-]+;base64,)?[A-Za-z0-9+/]+={0,2}$/, 'base64 file');

const createDokumenKelengkapan = Joi.object({
  namaKelengkapan: Joi.string().max(150).required(),
  isWajib: Joi.boolean(),
  isBeasiswa: Joi.boolean(),
  file: base64File.allow(null, ''),
});

const updateDokumenKelengkapan = Joi.object({
  namaKelengkapan: Joi.string().max(150),
  isWajib: Joi.boolean(),
  isBeasiswa: Joi.boolean(),
  file: base64File.allow(null, ''),
}).min(1);

module.exports = { createDokumenKelengkapan, updateDokumenKelengkapan };
