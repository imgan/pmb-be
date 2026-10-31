const Joi = require('joi');

const fields = {
  mahasiswaId: Joi.number().integer(),
  tahunAjaranId: Joi.number().integer().allow(null),
  semester: Joi.number().integer().min(1).max(14).allow(null),
  judul: Joi.string().trim().max(2000),
  lokasi: Joi.string().trim().max(200),
  alamatLokasi: Joi.string().allow('', null),
  emailPerusahaan: Joi.string().trim().email().max(150).allow('', null),
  teleponPerusahaan: Joi.string().trim().max(30).allow('', null),
  pembimbingLapangan: Joi.string().max(150).allow('', null),
  pembimbingMagangId: Joi.number().integer().allow(null),
  tanggalMulai: Joi.date().iso().allow(null),
  tanggalSelesai: Joi.date().iso().allow(null),
  nilai: Joi.number().min(0).max(100).allow(null),
  keterangan: Joi.string().allow('', null),
};

const createNilaiMagang = Joi.object({
  ...fields,
  mahasiswaId: fields.mahasiswaId.required(),
  judul: fields.judul.required(),
  lokasi: fields.lokasi.required(),
});

const updateNilaiMagang = Joi.object(fields).min(1);

module.exports = { createNilaiMagang, updateNilaiMagang };
