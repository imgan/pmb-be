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

// Popup Data Pendidikan (menu Peserta).
const savePendidikan = Joi.object({
  asalSekolah: Joi.string().trim().max(150).required(),
  jurusanSekolah: Joi.string().trim().max(100).allow('', null),
  tahunLulus: Joi.string().pattern(/^\d{4}$/).allow('', null).messages({ 'string.pattern.base': 'Tahun lulus harus 4 digit' }),
  jenisPengelolaanSekolah: Joi.string().valid('negeri', 'swasta').allow('', null),
  alamatSekolah: Joi.string().trim().max(255).allow('', null),
  nisn: Joi.string().pattern(/^\d{10}$/).allow('', null).messages({ 'string.pattern.base': 'NISN harus 10 digit angka' }),
});

const saveSumberInformasi = Joi.object({
  sumberInformasiId: Joi.number().integer().allow(null),
  keteranganSumber: Joi.string().trim().max(1000).allow('', null),
  kodeUnik: Joi.string().trim().max(50).allow('', null),
});
const kunciSumber = Joi.object({ terkunci: Joi.boolean().required() });
const saveDataPmb = Joi.object({
  golonganKelasId: Joi.number().integer().allow(null),
  beasiswaId: Joi.number().integer().allow(null),
  ukuranAlmamater: Joi.string().trim().max(20).allow('', null),
  gelombangId: Joi.number().integer().allow(null),
  jurusan1Id: Joi.number().integer().allow(null),
  jurusan2Id: Joi.number().integer().allow(null),
  jurusan3Id: Joi.number().integer().allow(null),
});

module.exports = { createCalonMahasiswa, updateCalonMahasiswa, savePendidikan, saveSumberInformasi, kunciSumber, saveDataPmb };
