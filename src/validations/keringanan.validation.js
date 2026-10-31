const Joi = require('joi');

const STATUS_OPTIONS = ['DIAJUKAN', 'DISETUJUI', 'DITOLAK'];

const PESAN_BERLAKU = 'Pilih minimal satu: KRS, UTS, atau UAS';
const PESAN_SAMPAI = 'Sampai tanggal tidak boleh sebelum tanggal keringanan';

const createKeringanan = Joi.object({
  nim: Joi.string().max(30).required(),
  tanggal: Joi.date().required(),
  jumlahBayar: Joi.number().min(0).required(),
  berlakuKrs: Joi.boolean().default(true),
  berlakuUts: Joi.boolean().default(true),
  berlakuUas: Joi.boolean().default(true),
  sampaiTanggal: Joi.date().min(Joi.ref('tanggal')).allow(null).messages({ 'date.min': PESAN_SAMPAI }),
  alasan: Joi.string().allow(null, ''),
  status: Joi.string().valid(...STATUS_OPTIONS),
}).custom((value, helpers) => (value.berlakuKrs || value.berlakuUts || value.berlakuUas ? value : helpers.message(PESAN_BERLAKU)));

const updateKeringanan = Joi.object({
  nim: Joi.string().max(30),
  tanggal: Joi.date(),
  jumlahBayar: Joi.number().min(0),
  berlakuKrs: Joi.boolean(),
  berlakuUts: Joi.boolean(),
  berlakuUas: Joi.boolean(),
  sampaiTanggal: Joi.when('tanggal', {
    is: Joi.exist(),
    then: Joi.date().min(Joi.ref('tanggal')).allow(null).messages({ 'date.min': PESAN_SAMPAI }),
    otherwise: Joi.date().allow(null),
  }),
  alasan: Joi.string().allow(null, ''),
  status: Joi.string().valid(...STATUS_OPTIONS),
})
  .min(1)
  .custom((value, helpers) =>
    [value.berlakuKrs, value.berlakuUts, value.berlakuUas].every((v) => v === false) ? helpers.message(PESAN_BERLAKU) : value
  );

module.exports = { createKeringanan, updateKeringanan };
