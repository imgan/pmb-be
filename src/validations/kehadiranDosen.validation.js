const Joi = require('joi');

const STATUS_OPTIONS = ['HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT'];

const createKehadiranDosen = Joi.object({
  jadwalKuliahId: Joi.number().integer().required(),
  dosenId: Joi.number().integer().required(),
  tanggalRealisasi: Joi.date().required(),
  status: Joi.string().valid(...STATUS_OPTIONS),
  keterangan: Joi.string().allow('', null),
});

const updateKehadiranDosen = Joi.object({
  jadwalKuliahId: Joi.number().integer(),
  dosenId: Joi.number().integer(),
  tanggalRealisasi: Joi.date(),
  status: Joi.string().valid(...STATUS_OPTIONS),
  keterangan: Joi.string().allow('', null),
}).min(1);

module.exports = { createKehadiranDosen, updateKehadiranDosen };
