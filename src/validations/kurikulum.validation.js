const Joi = require('joi');

const KELOMPOK_MATA_KULIAH = ['MPK', 'MKK', 'MKB', 'MPB', 'MBB'];
const KELOMPOK_KURIKULUM = ['WAJIB', 'PILIHAN'];
const JENIS_MATA_KULIAH = ['TEORI', 'PRAKTIK', 'TEORI_PRAKTIK'];
const KELOMPOK_KOMPETENSI = ['UTAMA', 'PENDUKUNG', 'LAINNYA'];

const createKurikulum = Joi.object({
  jurusanId: Joi.number().integer().allow(null),
  tahunAjaranId: Joi.number().integer().allow(null),
  kode: Joi.string().max(30).required(),
  mataKuliah: Joi.string().max(200).required(),
  mataKuliahEn: Joi.string().max(200).allow(null, ''),
  kelompokMataKuliah: Joi.string().valid(...KELOMPOK_MATA_KULIAH).allow(null),
  kelompokKurikulum: Joi.string().valid(...KELOMPOK_KURIKULUM).allow(null),
  jenisMataKuliah: Joi.string().valid(...JENIS_MATA_KULIAH).allow(null),
  sksTeori: Joi.number().integer().min(0).default(0),
  sksPraktek: Joi.number().integer().min(0).default(0),
  sksLab: Joi.number().integer().min(0).default(0),
  sksSimulasi: Joi.number().integer().min(0).default(0),
  kelompokKompetensi: Joi.string().valid(...KELOMPOK_KOMPETENSI).allow(null),
  kompIlmuKomputer: Joi.string().max(100).allow(null, ''),
  mataKuliahMinat: Joi.string().max(100).allow(null, ''),
  muatanMataKuliah: Joi.string().max(255).allow(null, ''),
  metodePembelajaran: Joi.string().max(100).allow(null, ''),
  tanggalMulaiEfektif: Joi.date().iso().allow(null),
  tanggalAkhirEfektif: Joi.date().iso().allow(null),
  idMatkul: Joi.string().max(30).allow(null, ''),
  semester: Joi.number().integer().min(1).max(14).allow(null),
});

const updateKurikulum = Joi.object({
  jurusanId: Joi.number().integer().allow(null),
  tahunAjaranId: Joi.number().integer().allow(null),
  kode: Joi.string().max(30),
  mataKuliah: Joi.string().max(200),
  mataKuliahEn: Joi.string().max(200).allow(null, ''),
  kelompokMataKuliah: Joi.string().valid(...KELOMPOK_MATA_KULIAH).allow(null),
  kelompokKurikulum: Joi.string().valid(...KELOMPOK_KURIKULUM).allow(null),
  jenisMataKuliah: Joi.string().valid(...JENIS_MATA_KULIAH).allow(null),
  sksTeori: Joi.number().integer().min(0),
  sksPraktek: Joi.number().integer().min(0),
  sksLab: Joi.number().integer().min(0),
  sksSimulasi: Joi.number().integer().min(0),
  kelompokKompetensi: Joi.string().valid(...KELOMPOK_KOMPETENSI).allow(null),
  kompIlmuKomputer: Joi.string().max(100).allow(null, ''),
  mataKuliahMinat: Joi.string().max(100).allow(null, ''),
  muatanMataKuliah: Joi.string().max(255).allow(null, ''),
  metodePembelajaran: Joi.string().max(100).allow(null, ''),
  tanggalMulaiEfektif: Joi.date().iso().allow(null),
  tanggalAkhirEfektif: Joi.date().iso().allow(null),
  idMatkul: Joi.string().max(30).allow(null, ''),
  semester: Joi.number().integer().min(1).max(14).allow(null),
}).min(1);

const importKurikulum = Joi.object({
  file: Joi.string().required(),
});

module.exports = { createKurikulum, updateKurikulum, importKurikulum };
