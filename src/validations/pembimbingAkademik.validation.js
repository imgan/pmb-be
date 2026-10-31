const Joi = require('joi');

const createPembimbingAkademik = Joi.object({
  dosenId: Joi.number().integer().required(),
  noSk: Joi.string().max(100).allow('', null),
  tanggalSk: Joi.date().allow(null),
});

const updatePembimbingAkademik = Joi.object({
  dosenId: Joi.number().integer(),
  noSk: Joi.string().max(100).allow('', null),
  tanggalSk: Joi.date().allow(null),
}).min(1);

// Atur mahasiswa bimbingan: id mahasiswa yang ditetapkan / dilepas dari pembimbing akademik ini.
const setMahasiswaBimbingan = Joi.object({
  tambah: Joi.array().items(Joi.number().integer()).default([]),
  hapus: Joi.array().items(Joi.number().integer()).default([]),
});

module.exports = { createPembimbingAkademik, updatePembimbingAkademik, setMahasiswaBimbingan };
