const Joi = require('joi');

const fields = {
  namaRuang: Joi.string().trim().max(50),
  kampus: Joi.string().trim().max(50).allow('', null),
  lantai: Joi.number().integer().min(0).max(100).allow(null),
  projector: Joi.boolean(),
  keterangan: Joi.string().trim().max(255).allow('', null),
  fungsi: Joi.string().trim().max(100).allow('', null),
  kursi: Joi.number().integer().min(0).max(10000).allow(null),
};

const createRuangan = Joi.object({ ...fields, namaRuang: fields.namaRuang.required() });

const updateRuangan = Joi.object(fields).min(1);

module.exports = { createRuangan, updateRuangan };
