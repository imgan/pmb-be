const Joi = require('joi');

const createPembayaranKuliah = Joi.object({
  tagihanKuliahId: Joi.number().integer().required(),
  tanggalBayar: Joi.date().required(),
  noBukti: Joi.string().max(50).required(),
  nominal: Joi.number().min(0).required(),
  kodeBank: Joi.string().max(30).allow('', null),
  keterangan: Joi.string().max(150).allow('', null),
});

module.exports = { createPembayaranKuliah };
