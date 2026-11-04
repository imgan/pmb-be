const Joi = require('joi');

const createJurusan = Joi.object({
  golonganKelasId: Joi.number().integer().required(),
  namaJurusan: Joi.string().max(150).required(),
  kodeProdi: Joi.string().max(20).allow('', null),
  singkatan: Joi.string().max(5).allow('', null),
  foto: Joi.string().allow('', null),
  prospekKarir: Joi.string().allow('', null),
  jenjangPendidikan: Joi.string().max(50).allow('', null),
  gelarSingkat: Joi.string().max(30).allow('', null),
  gelarLengkap: Joi.string().max(150).allow('', null),
  namaFakultas: Joi.string().max(150).allow('', null),
});

const updateJurusan = Joi.object({
  golonganKelasId: Joi.number().integer(),
  namaJurusan: Joi.string().max(150),
  kodeProdi: Joi.string().max(20).allow('', null),
  singkatan: Joi.string().max(5).allow('', null),
  foto: Joi.string().allow('', null),
  prospekKarir: Joi.string().allow('', null),
  jenjangPendidikan: Joi.string().max(50).allow('', null),
  gelarSingkat: Joi.string().max(30).allow('', null),
  gelarLengkap: Joi.string().max(150).allow('', null),
  namaFakultas: Joi.string().max(150).allow('', null),
}).min(1);

/** Master Jurusan / Prodi: satu prodi dengan banyak golongan kelas. */
const simpanProdiGrup = Joi.object({
  golonganKelasIds: Joi.array().items(Joi.number().integer()).min(1).unique().required(),
  namaJurusan: Joi.string().trim().max(150).required(),
  kodeProdi: Joi.string().max(20).allow('', null),
  singkatan: Joi.string().max(5).allow('', null),
  foto: Joi.string().allow('', null),
  prospekKarir: Joi.string().allow('', null),
  jenjangPendidikan: Joi.string().max(50).allow('', null),
  gelarSingkat: Joi.string().max(30).allow('', null),
  gelarLengkap: Joi.string().max(150).allow('', null),
  namaFakultas: Joi.string().max(150).allow('', null),
});

const importJurusan = Joi.object({
  file: Joi.string().required(),
});

module.exports = { createJurusan, updateJurusan, importJurusan, simpanProdiGrup };
