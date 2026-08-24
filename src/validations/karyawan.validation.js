const Joi = require('joi');

const createKaryawan = Joi.object({
  nip: Joi.string().max(20).required(),
  idFinger: Joi.string().max(30).allow('', null),
  namaLengkap: Joi.string().max(150).required(),
  tempatLahir: Joi.string().max(100).allow('', null),
  tanggalLahir: Joi.date().allow(null),
  jenisKelamin: Joi.string().valid('L', 'P').allow(null),
  pendidikanAkhir: Joi.string().max(50).allow('', null),
  agama: Joi.string().max(50).allow('', null),
  telpHp: Joi.string().max(30).allow('', null),
  email: Joi.string().email({ tlds: false }).max(150).allow('', null),
  alamat: Joi.string().allow('', null),
  bagian: Joi.string().max(100).allow('', null),
  jabatan: Joi.string().max(100).allow('', null),
  status: Joi.string().max(50).allow('', null),
  tmt: Joi.date().allow(null),
  isActive: Joi.boolean(),
});

const updateKaryawan = Joi.object({
  nip: Joi.string().max(20),
  idFinger: Joi.string().max(30).allow('', null),
  namaLengkap: Joi.string().max(150),
  tempatLahir: Joi.string().max(100).allow('', null),
  tanggalLahir: Joi.date().allow(null),
  jenisKelamin: Joi.string().valid('L', 'P').allow(null),
  pendidikanAkhir: Joi.string().max(50).allow('', null),
  agama: Joi.string().max(50).allow('', null),
  telpHp: Joi.string().max(30).allow('', null),
  email: Joi.string().email({ tlds: false }).max(150).allow('', null),
  alamat: Joi.string().allow('', null),
  bagian: Joi.string().max(100).allow('', null),
  jabatan: Joi.string().max(100).allow('', null),
  status: Joi.string().max(50).allow('', null),
  tmt: Joi.date().allow(null),
  isActive: Joi.boolean(),
}).min(1);

const importKaryawan = Joi.object({
  file: Joi.string().required(),
});

module.exports = { createKaryawan, updateKaryawan, importKaryawan };
