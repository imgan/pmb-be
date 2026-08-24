const Joi = require('joi');

const createCalonMahasiswa = Joi.object({
  nama: Joi.string().max(150).required(),
  asalSekolah: Joi.string().max(150).required(),
  prodi: Joi.string().max(150).required(),
  gelombangId: Joi.number().integer().allow(null),
  pesertaId: Joi.number().integer().allow(null),
  noTelepon: Joi.string().max(30).allow('', null),
  skemaPembiayaan: Joi.string().valid('beasiswa', 'mandiri'),
  formulirPendaftaran: Joi.boolean(),
  lulusTesMasuk: Joi.boolean(),
  akunBeasiswa: Joi.boolean().allow(null),
  kelengkapanPersyaratan: Joi.boolean(),
  statusBeasiswa: Joi.string().valid('diusulkan', 'disetujui', 'ditolak').allow(null),
  statusKuliah: Joi.string().valid('menunggu', 'diterima', 'ditolak'),
});

const updateCalonMahasiswa = Joi.object({
  nama: Joi.string().max(150),
  asalSekolah: Joi.string().max(150),
  prodi: Joi.string().max(150),
  gelombangId: Joi.number().integer().allow(null),
  pesertaId: Joi.number().integer().allow(null),
  noTelepon: Joi.string().max(30).allow('', null),
  skemaPembiayaan: Joi.string().valid('beasiswa', 'mandiri'),
  formulirPendaftaran: Joi.boolean(),
  lulusTesMasuk: Joi.boolean(),
  akunBeasiswa: Joi.boolean().allow(null),
  kelengkapanPersyaratan: Joi.boolean(),
  statusBeasiswa: Joi.string().valid('diusulkan', 'disetujui', 'ditolak').allow(null),
  statusKuliah: Joi.string().valid('menunggu', 'diterima', 'ditolak'),
}).min(1);

module.exports = { createCalonMahasiswa, updateCalonMahasiswa };
