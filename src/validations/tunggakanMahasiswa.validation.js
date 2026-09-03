const Joi = require('joi');

const createTunggakanMahasiswa = Joi.object({
  nim: Joi.string().max(30).required(),
  tanggal: Joi.date().required(),
  nominal: Joi.number().min(0).required(),
  keterangan: Joi.string().allow(null, ''),
});

const updateTunggakanMahasiswa = Joi.object({
  nim: Joi.string().max(30),
  tanggal: Joi.date(),
  nominal: Joi.number().min(0),
  keterangan: Joi.string().allow(null, ''),
}).min(1);

const importTunggakanMahasiswa = Joi.object({
  file: Joi.string().required(),
});

module.exports = { createTunggakanMahasiswa, updateTunggakanMahasiswa, importTunggakanMahasiswa };
