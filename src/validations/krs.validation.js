const Joi = require('joi');

const STATUS_OPTIONS = ['DRAFT', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK'];

const createKrs = Joi.object({
  mahasiswaId: Joi.number().integer().required(),
  semester: Joi.number().integer().min(1).max(14).required(),
  tahunAjaranId: Joi.number().integer().required(),
  status: Joi.string().valid(...STATUS_OPTIONS),
  jadwalKuliahIds: Joi.array().items(Joi.number().integer()).default([]),
});

const updateKrs = Joi.object({
  semester: Joi.number().integer().min(1).max(14),
  tahunAjaranId: Joi.number().integer(),
  status: Joi.string().valid(...STATUS_OPTIONS),
  jadwalKuliahIds: Joi.array().items(Joi.number().integer()),
}).min(1);

module.exports = { createKrs, updateKrs };
