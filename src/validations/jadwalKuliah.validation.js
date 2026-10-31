const Joi = require('joi');

const HARI_OPTIONS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

// Dosen pengampu beserta SKS yang diberikan ke masing-masing dosen (boleh pecahan, mis. 1,5).
const dosenPengampu = Joi.array()
  .items(
    Joi.object({
      dosenId: Joi.number().integer().required(),
      sks: Joi.number().min(0).max(999).precision(2).allow(null),
    })
  )
  .unique('dosenId');

// Mata kuliah jadwal baru wajib dipilih dari Matakuliah Aktif (mataKuliahId + aktif semester); kode,
// nama, dan SKS diisi otomatis dari mata kuliah tsb.
const createJadwalKuliah = Joi.object({
  kelas: Joi.string().max(30).required(),
  mataKuliahId: Joi.number().integer().required().messages({ 'any.required': 'Mata kuliah wajib dipilih' }),
  kodeMataKuliah: Joi.string().max(30),
  namaMataKuliah: Joi.string().max(150),
  sks: Joi.number().integer().min(0).allow(null),
  sksTeori: Joi.number().integer().min(0),
  sksPraktik: Joi.number().integer().min(0),
  sksLab: Joi.number().integer().min(0),
  dosenKordinatorId: Joi.number().integer().required(),
  tahunAjaranId: Joi.number().integer().required(),
  // Semester jadwal = "Aktif Semester" mata kuliah di menu Matakuliah Aktif.
  semester: Joi.number().integer().min(1).max(14).required(),
  dosenPengampuIds: Joi.array().items(Joi.number().integer()),
  dosenPengampu,
  hari: Joi.array().items(Joi.string().valid(...HARI_OPTIONS)).allow(null),
  jam: Joi.number().integer().min(1).allow(null),
  ruangan: Joi.string().max(50).allow('', null),
  gcr: Joi.string().max(255).allow('', null),
  isActive: Joi.boolean(),
}).oxor('dosenPengampuIds', 'dosenPengampu');

const updateJadwalKuliah = Joi.object({
  kelas: Joi.string().max(30),
  kodeMataKuliah: Joi.string().max(30),
  namaMataKuliah: Joi.string().max(150),
  sks: Joi.number().integer().min(0).allow(null),
  sksTeori: Joi.number().integer().min(0),
  sksPraktik: Joi.number().integer().min(0),
  sksLab: Joi.number().integer().min(0),
  dosenKordinatorId: Joi.number().integer(),
  tahunAjaranId: Joi.number().integer(),
  mataKuliahId: Joi.number().integer().allow(null),
  semester: Joi.number().integer().min(1).max(14).allow(null),
  dosenPengampuIds: Joi.array().items(Joi.number().integer()),
  dosenPengampu,
  hari: Joi.array().items(Joi.string().valid(...HARI_OPTIONS)).allow(null),
  jam: Joi.number().integer().min(1).allow(null),
  ruangan: Joi.string().max(50).allow('', null),
  gcr: Joi.string().max(255).allow('', null),
  isActive: Joi.boolean(),
})
  .min(1)
  .oxor('dosenPengampuIds', 'dosenPengampu');

const importJadwalKuliah = Joi.object({
  file: Joi.string().required(),
});

module.exports = { createJadwalKuliah, updateJadwalKuliah, importJadwalKuliah };
