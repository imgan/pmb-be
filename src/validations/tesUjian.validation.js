const Joi = require('joi');

const createTesUjian = Joi.object({
  namaUjian: Joi.string().trim().max(150).required(),
  gelombangId: Joi.number().integer().required(),
  prodi: Joi.string().trim().max(150).allow('', null),
  tanggal: Joi.date().required(),
  lokasi: Joi.string().allow('', null),
  waktu: Joi.string().trim().max(100).allow('', null),
  bankUjianId: Joi.number().integer().allow(null),
});

const updateTesUjian = Joi.object({
  namaUjian: Joi.string().trim().max(150),
  gelombangId: Joi.number().integer(),
  prodi: Joi.string().trim().max(150).allow('', null),
  tanggal: Joi.date(),
  lokasi: Joi.string().allow('', null),
  waktu: Joi.string().trim().max(100).allow('', null),
  bankUjianId: Joi.number().integer().allow(null),
}).min(1);

const tambahPeserta = Joi.object({
  pesertaIds: Joi.array().items(Joi.number().integer()).min(1).required(),
});

const setNilai = Joi.object({
  nilai: Joi.number().min(0).max(100).allow(null).required(),
  status: Joi.string().valid('belum_ujian', 'lulus', 'tidak_lulus').required(),
});

/** Peserta: simpan jawaban satu soal (PG = index pilihan, essay = teks). */
const simpanJawabanUjian = Joi.object({
  soalId: Joi.number().integer().required(),
  pilihan: Joi.number().integer().min(0).allow(null),
  teks: Joi.string().allow('', null).max(20000),
});

/** Admin: skor essay per soal { soalId: skor }. */
const koreksiEssay = Joi.object({
  skor: Joi.object().pattern(Joi.string().pattern(/^\d+$/), Joi.number().min(0).allow(null)).required(),
});

module.exports = { createTesUjian, updateTesUjian, tambahPeserta, setNilai, simpanJawabanUjian, koreksiEssay };
