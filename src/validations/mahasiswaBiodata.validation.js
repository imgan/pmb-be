const Joi = require('joi');

const saveMahasiswaBiodata = Joi.object({
  tempatLahir: Joi.string().max(100).allow('', null),
  tanggalLahir: Joi.date().iso().allow(null),
  agama: Joi.string().max(50).allow('', null),
  kewarganegaraan: Joi.string().max(50).allow('', null),
  noKtp: Joi.string().max(20).allow('', null),
  npwp: Joi.string().max(30).allow('', null),
  jalan: Joi.string().max(255).allow('', null),
  dusun: Joi.string().max(100).allow('', null),
  rt: Joi.string().max(3).allow('', null),
  rw: Joi.string().max(3).allow('', null),
  kelurahan: Joi.string().max(100).allow('', null),
  kodePos: Joi.string().max(10).allow('', null),
  propinsi: Joi.string().max(100).allow('', null),
  jenisTinggal: Joi.string().max(50).allow('', null),
  alatTransportasi: Joi.string().max(50).allow('', null),
  kelas: Joi.string().max(20).allow('', null),
  programStudi: Joi.string().max(150).allow('', null),
  waktuKuliah: Joi.string().max(20).allow('', null),
  statusBelajar: Joi.string().max(20).allow('', null),
  statusKuliah: Joi.string().max(20).allow('', null),
  statusDikti: Joi.string().max(50).allow('', null),
  email: Joi.string().email().allow('', null),
  hp: Joi.string().max(20).allow('', null),
  almamater: Joi.string().max(150).allow('', null),
  namaAyah: Joi.string().max(150).allow('', null),
  pekerjaanAyah: Joi.string().max(100).allow('', null),
  namaIbu: Joi.string().max(150).allow('', null),
  pekerjaanIbu: Joi.string().max(100).allow('', null),
}).min(1);

module.exports = { saveMahasiswaBiodata };
