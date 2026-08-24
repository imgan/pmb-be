const Joi = require('joi');

const createDosen = Joi.object({
  nik: Joi.string().max(20).allow('', null),
  nidn: Joi.string().max(20).required(),
  namaLengkap: Joi.string().max(150).required(),
  tempatLahir: Joi.string().max(100).allow('', null),
  tanggalLahir: Joi.date().allow(null),
  jenisKelamin: Joi.string().valid('L', 'P').allow(null),
  pendidikanAkhir: Joi.string().max(50).allow('', null),
  agama: Joi.string().max(50).allow('', null),
  telpHp: Joi.string().max(30).allow('', null),
  email: Joi.string().email({ tlds: false }).max(150).allow('', null),
  alamat: Joi.string().allow('', null),
  statusDosen: Joi.string().valid('TETAP', 'TIDAK_TETAP').allow(null),
  status: Joi.string().max(50).allow('', null),
  waktu: Joi.string().valid('M', 'P').allow(null),
  tmt: Joi.date().allow(null),
  karyawanInternal: Joi.boolean(),
  infaq: Joi.boolean(),
  kelompokFakultas: Joi.string().valid('FKF', 'FTID', 'FIP', 'NON_BASE').required(),
  isActive: Joi.boolean(),
});

const updateDosen = Joi.object({
  nik: Joi.string().max(20).allow('', null),
  nidn: Joi.string().max(20),
  namaLengkap: Joi.string().max(150),
  tempatLahir: Joi.string().max(100).allow('', null),
  tanggalLahir: Joi.date().allow(null),
  jenisKelamin: Joi.string().valid('L', 'P').allow(null),
  pendidikanAkhir: Joi.string().max(50).allow('', null),
  agama: Joi.string().max(50).allow('', null),
  telpHp: Joi.string().max(30).allow('', null),
  email: Joi.string().email({ tlds: false }).max(150).allow('', null),
  alamat: Joi.string().allow('', null),
  statusDosen: Joi.string().valid('TETAP', 'TIDAK_TETAP').allow(null),
  status: Joi.string().max(50).allow('', null),
  waktu: Joi.string().valid('M', 'P').allow(null),
  tmt: Joi.date().allow(null),
  karyawanInternal: Joi.boolean(),
  infaq: Joi.boolean(),
  kelompokFakultas: Joi.string().valid('FKF', 'FTID', 'FIP', 'NON_BASE'),
  isActive: Joi.boolean(),
}).min(1);

const importDosen = Joi.object({
  file: Joi.string().required(),
});

module.exports = { createDosen, updateDosen, importDosen };
