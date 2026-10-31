const Joi = require('joi');

const KELOMPOK_MATA_KULIAH = ['MPK', 'MKK', 'MKB', 'MPB', 'MBB'];
const KELOMPOK_KURIKULUM = ['WAJIB', 'PILIHAN'];
const JENIS_MATA_KULIAH = ['TEORI', 'PRAKTIK', 'TEORI_PRAKTIK'];
const KELOMPOK_KOMPETENSI = ['UTAMA', 'PENDUKUNG', 'LAINNYA'];

// Mata kuliah selalu milik satu kurikulum (kurikulumId); prodi & tahun mengikuti kurikulum induk.
const fields = {
  kurikulumId: Joi.number().integer(),
  kode: Joi.string().trim().max(30),
  mataKuliah: Joi.string().trim().max(200),
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
  idMatkul: Joi.string().max(30).allow(null, ''),
  semester: Joi.number().integer().min(1).max(14).allow(null),
  isObe: Joi.boolean(),
  targetCpl: Joi.number().min(0).max(100).allow(null),
  targetCpmk: Joi.number().min(0).max(100).allow(null),
  silabus: Joi.string().allow(null, ''),
  // Kunci tema ilustrasi (lihat pmb-fe utils/ikonMataKuliah.ts); kosong = otomatis.
  ikon: Joi.string().trim().max(40).allow(null, ''),
};

const createMataKuliah = Joi.object({
  ...fields,
  kurikulumId: fields.kurikulumId.required().messages({ 'any.required': 'Kurikulum wajib dipilih' }),
  kode: fields.kode.required(),
  mataKuliah: fields.mataKuliah.required(),
  sksTeori: fields.sksTeori.default(0),
  sksPraktek: fields.sksPraktek.default(0),
  sksLab: fields.sksLab.default(0),
  sksSimulasi: fields.sksSimulasi.default(0),
});

const updateMataKuliah = Joi.object(fields).min(1);

const importMataKuliah = Joi.object({
  file: Joi.string().required(),
  // Opsional: semua baris masuk ke kurikulum ini (import dari halaman detail kurikulum).
  kurikulumId: Joi.number().integer().allow(null),
});

// Setting Kurikulum: OBE + target CPL/CPMK untuk banyak MK satu kurikulum sekaligus.
const settingKurikulum = Joi.object({
  kurikulumId: Joi.number().integer().required(),
  items: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().required(),
        isObe: Joi.boolean().required(),
        targetCpl: Joi.number().min(0).max(100).allow(null),
        targetCpmk: Joi.number().min(0).max(100).allow(null),
      })
    )
    .min(1)
    .required(),
});

module.exports = { createMataKuliah, updateMataKuliah, importMataKuliah, settingKurikulum };
