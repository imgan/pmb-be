const Joi = require('joi');

const STATUS_BELAJAR = ['BARU', 'LAMA', 'KARYAWAN', 'BARU KARYAWAN'];

const createTarifKuliah = Joi.object({
  jurusanId: Joi.number().integer().required(),
  tahunAngkatan: Joi.number().integer().required(),
  semester: Joi.number().integer().required(),
  biayaSks: Joi.number().min(0).required(),
  biayaBpp: Joi.number().min(0),
  biayaSpp: Joi.number().min(0),
  statusBelajar: Joi.string().valid(...STATUS_BELAJAR).required(),
  isActive: Joi.boolean(),
});

const updateTarifKuliah = Joi.object({
  jurusanId: Joi.number().integer(),
  tahunAngkatan: Joi.number().integer(),
  semester: Joi.number().integer(),
  biayaSks: Joi.number().min(0),
  biayaBpp: Joi.number().min(0),
  biayaSpp: Joi.number().min(0),
  statusBelajar: Joi.string().valid(...STATUS_BELAJAR),
  isActive: Joi.boolean(),
}).min(1);

const importTarifKuliah = Joi.object({
  file: Joi.string().required(),
});

module.exports = { createTarifKuliah, updateTarifKuliah, importTarifKuliah, STATUS_BELAJAR };
