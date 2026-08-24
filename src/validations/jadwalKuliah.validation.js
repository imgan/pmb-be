const Joi = require('joi');

const HARI_OPTIONS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

const createJadwalKuliah = Joi.object({
  kelas: Joi.string().max(30).required(),
  kodeMataKuliah: Joi.string().max(30).required(),
  namaMataKuliah: Joi.string().max(150).required(),
  sks: Joi.number().integer().min(0).allow(null),
  sksTeori: Joi.number().integer().min(0),
  sksPraktik: Joi.number().integer().min(0),
  sksLab: Joi.number().integer().min(0),
  dosenKordinatorId: Joi.number().integer().required(),
  tahunAjaranId: Joi.number().integer().required(),
  mataKuliahId: Joi.number().integer().allow(null),
  semester: Joi.number().integer().min(1).max(14).allow(null),
  dosenPengampuIds: Joi.array().items(Joi.number().integer()).default([]),
  hari: Joi.array().items(Joi.string().valid(...HARI_OPTIONS)).allow(null),
  jam: Joi.number().integer().min(1).allow(null),
  ruangan: Joi.string().max(50).allow('', null),
  gcr: Joi.string().max(255).allow('', null),
  isActive: Joi.boolean(),
});

const updateJadwalKuliah = Joi.object({
  kelas: Joi.string().max(30),
  kodeMataKuliah: Joi.string().max(30),
  namaMataKuliah: Joi.string().max(150),
  sks: Joi.number().integer().min(0).allow(null),
  sksTeori: Joi.number().integer().min(0),
  sksPraktik: Joi.number().integer().min(0),
  sksLab: Joi.number().integer().min(0),
  dosenKordinatorId: Joi.number().integer(),
  tahunAjaranId: Joi.number().integer(),
  mataKuliahId: Joi.number().integer().allow(null),
  semester: Joi.number().integer().min(1).max(14).allow(null),
  dosenPengampuIds: Joi.array().items(Joi.number().integer()),
  hari: Joi.array().items(Joi.string().valid(...HARI_OPTIONS)).allow(null),
  jam: Joi.number().integer().min(1).allow(null),
  ruangan: Joi.string().max(50).allow('', null),
  gcr: Joi.string().max(255).allow('', null),
  isActive: Joi.boolean(),
}).min(1);

const importJadwalKuliah = Joi.object({
  file: Joi.string().required(),
});

module.exports = { createJadwalKuliah, updateJadwalKuliah, importJadwalKuliah };
