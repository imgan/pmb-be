const Joi = require('joi');

const STATUS_VALUES = ['DINAS_LUAR', 'CUTI', 'LUPA_KEHADIRAN', 'CUTI_SPESIAL', 'CUTI_BERSAMA'];

const LAMPIRAN_PATTERN = /^data:(application\/pdf|image\/png|image\/jpeg);base64,/;

const lampiranField = Joi.string()
  .pattern(LAMPIRAN_PATTERN)
  .allow(null)
  .messages({ 'string.pattern.base': 'Lampiran harus berformat PDF, PNG, atau JPEG' });

const createDinasCuti = Joi.object({
  karyawanId: Joi.number().integer().required(),
  tanggalKehadiran: Joi.date().required(),
  status: Joi.string()
    .valid(...STATUS_VALUES)
    .required(),
  keperluan: Joi.string().allow('', null),
  lampiranNama: Joi.string().max(255).allow('', null),
  lampiran: lampiranField,
});

const updateDinasCuti = Joi.object({
  karyawanId: Joi.number().integer(),
  tanggalKehadiran: Joi.date(),
  status: Joi.string().valid(...STATUS_VALUES),
  keperluan: Joi.string().allow('', null),
  lampiranNama: Joi.string().max(255).allow('', null),
  lampiran: lampiranField,
});

module.exports = { createDinasCuti, updateDinasCuti, STATUS_VALUES };
