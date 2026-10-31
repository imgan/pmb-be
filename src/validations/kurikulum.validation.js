const Joi = require('joi');

// Kurikulum (header): prodi + tahun kurikulum; mata kuliahnya dikelola lewat /mata-kuliah.
const createKurikulum = Joi.object({
  jurusanId: Joi.number().integer().required().messages({ 'any.required': 'Prodi wajib dipilih' }),
  tahunKurikulum: Joi.number().integer().min(1990).max(2100).required().messages({ 'any.required': 'Tahun kurikulum wajib diisi' }),
  nama: Joi.string().trim().max(150).allow('', null),
  tanggalMulaiEfektif: Joi.date().iso().allow(null),
  tanggalAkhirEfektif: Joi.date().iso().allow(null),
  keterangan: Joi.string().allow('', null),
  isActive: Joi.boolean(),
});

const updateKurikulum = Joi.object({
  jurusanId: Joi.number().integer(),
  tahunKurikulum: Joi.number().integer().min(1990).max(2100),
  nama: Joi.string().trim().max(150).allow(''),
  tanggalMulaiEfektif: Joi.date().iso().allow(null),
  tanggalAkhirEfektif: Joi.date().iso().allow(null),
  keterangan: Joi.string().allow('', null),
  isActive: Joi.boolean(),
}).min(1);

const setMatakuliahAktif = Joi.object({
  tahunAjaranId: Joi.number().integer().required(),
  // "Aktif Semester": semester tempat mata kuliah dibuka pada tahun akademik tsb.
  semester: Joi.number().integer().min(1).max(14).required(),
  mataKuliahIds: Joi.array().items(Joi.number().integer()).min(1).required(),
  aktif: Joi.boolean().required(),
});

module.exports = { createKurikulum, updateKurikulum, setMatakuliahAktif };
