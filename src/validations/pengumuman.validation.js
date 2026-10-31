const Joi = require('joi');

const fields = {
  judul: Joi.string().trim().max(200),
  isi: Joi.string().max(200000),
  jurusanId: Joi.number().integer().allow(null),
  untuk: Joi.string().valid('SEMUA', 'MAHASISWA', 'DOSEN'),
  tanggalTerbit: Joi.date().iso(),
  tanggalBerakhir: Joi.date().iso().allow(null, ''),
  isPenting: Joi.boolean(),
  isActive: Joi.boolean(),
};

const createPengumuman = Joi.object({
  ...fields,
  judul: fields.judul.required(),
  isi: fields.isi.required(),
  tanggalTerbit: fields.tanggalTerbit.required(),
});

const updatePengumuman = Joi.object(fields).min(1);

module.exports = { createPengumuman, updatePengumuman };
