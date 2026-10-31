const Joi = require('joi');

const soal = Joi.object({
  id: Joi.number().integer().allow(null),
  tipe: Joi.string().valid('PG', 'ESSAY').required(),
  pertanyaan: Joi.string().trim().required(),
  pilihan: Joi.when('tipe', {
    is: 'PG',
    then: Joi.array().items(Joi.string().trim().required()).min(2).max(6).required(),
    otherwise: Joi.any().strip(),
  }),
  jawabanBenar: Joi.when('tipe', { is: 'PG', then: Joi.number().integer().min(0).required(), otherwise: Joi.any().strip() }),
  bobot: Joi.number().greater(0).max(1000).default(1),
});

const base = {
  judul: Joi.string().trim().max(200),
  deskripsi: Joi.string().allow('', null),
  durasiMenit: Joi.number().integer().min(1).max(1440).allow(null),
  acakSoal: Joi.boolean(),
  soal: Joi.array().items(soal),
};

const createBankUjian = Joi.object({ ...base, judul: base.judul.required(), soal: base.soal.min(1).required() });
const updateBankUjian = Joi.object({ ...base, soal: base.soal.min(1) }).min(1);

module.exports = { createBankUjian, updateBankUjian };
