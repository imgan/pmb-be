const Joi = require('joi');

const createJurusan = Joi.object({
  golonganKelasId: Joi.number().integer().required(),
  namaJurusan: Joi.string().max(150).required(),
  kodeProdi: Joi.string().max(20).allow('', null),
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
  foto: Joi.string().allow('', null),
  prospekKarir: Joi.string().allow('', null),
  jenjangPendidikan: Joi.string().max(50).allow('', null),
  gelarSingkat: Joi.string().max(30).allow('', null),
  gelarLengkap: Joi.string().max(150).allow('', null),
  namaFakultas: Joi.string().max(150).allow('', null),
}).min(1);

const importJurusan = Joi.object({
  file: Joi.string().required(),
});

module.exports = { createJurusan, updateJurusan, importJurusan };
