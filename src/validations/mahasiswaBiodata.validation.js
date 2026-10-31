const Joi = require('joi');

const saveMahasiswaBiodata = Joi.object({
  tempatLahir: Joi.string().max(100).allow('', null),
  tanggalLahir: Joi.date().iso().allow(null),
  jenisKelamin: Joi.string().valid('L', 'P').allow('', null),
  agama: Joi.string().max(50).allow('', null),
  kewarganegaraan: Joi.string().max(50).allow('', null),
  noKtp: Joi.string().max(20).allow('', null),
  nisn: Joi.string().max(20).allow('', null),
  jalurPendaftaran: Joi.string().max(100).allow('', null),
  npwp: Joi.string().max(30).allow('', null),
  jenisPendaftaran: Joi.string().max(100).allow('', null),
  tanggalMasukKuliah: Joi.date().iso().allow(null),
  mulaiSemester: Joi.string().max(20).allow('', null),
  jalan: Joi.string().max(255).allow('', null),
  dusun: Joi.string().max(100).allow('', null),
  rt: Joi.string().max(3).allow('', null),
  rw: Joi.string().max(3).allow('', null),
  kelurahan: Joi.string().max(100).allow('', null),
  kecamatan: Joi.string().max(100).allow('', null),
  kodePos: Joi.string().max(10).allow('', null),
  propinsi: Joi.string().max(100).allow('', null),
  jenisTinggal: Joi.string().max(50).allow('', null),
  alatTransportasi: Joi.string().max(50).allow('', null),
  teleponRumah: Joi.string().max(20).allow('', null),
  kelas: Joi.string().max(20).allow('', null),
  programStudi: Joi.string().max(150).allow('', null),
  waktuKuliah: Joi.string().max(20).allow('', null),
  statusBelajar: Joi.string().max(20).allow('', null),
  statusKuliah: Joi.string().max(20).allow('', null),
  statusDikti: Joi.string().max(50).allow('', null),
  email: Joi.string().email().allow('', null),
  hp: Joi.string().max(20).allow('', null),
  almamater: Joi.string().max(150).allow('', null),
  terimaKps: Joi.string().max(10).allow('', null),
  // No KPS wajib kalau Terima KPS = Ya.
  noKps: Joi.when('terimaKps', {
    is: 'Ya',
    then: Joi.string().trim().max(30).invalid(null).required().messages({ 'any.required': 'No KPS wajib diisi untuk penerima KPS', 'string.empty': 'No KPS wajib diisi untuk penerima KPS', 'any.invalid': 'No KPS wajib diisi untuk penerima KPS' }),
    otherwise: Joi.string().max(30).allow('', null),
  }),
  nikAyah: Joi.string().max(20).allow('', null),
  namaAyah: Joi.string().max(150).allow('', null),
  tanggalLahirAyah: Joi.date().iso().allow(null),
  pendidikanAyah: Joi.string().max(50).allow('', null),
  pekerjaanAyah: Joi.string().max(100).allow('', null),
  penghasilanAyah: Joi.string().max(50).allow('', null),
  nikIbu: Joi.string().max(20).allow('', null),
  namaIbu: Joi.string().max(150).allow('', null),
  tanggalLahirIbu: Joi.date().iso().allow(null),
  pendidikanIbu: Joi.string().max(50).allow('', null),
  pekerjaanIbu: Joi.string().max(100).allow('', null),
  penghasilanIbu: Joi.string().max(50).allow('', null),
  namaWali: Joi.string().max(150).allow('', null),
  tanggalLahirWali: Joi.date().iso().allow(null),
  pendidikanWali: Joi.string().max(50).allow('', null),
  pekerjaanWali: Joi.string().max(100).allow('', null),
  penghasilanWali: Joi.string().max(50).allow('', null),
  jenisPembiayaan: Joi.string().max(100).allow('', null),
  biayaMasuk: Joi.number().min(0).allow(null),
  sksDiakui: Joi.number().integer().min(0).allow(null),
  perguruanTinggiAsal: Joi.string().max(150).allow('', null),
  programStudiAsal: Joi.string().max(150).allow('', null),
}).min(1);

// Field biodata yang dikunci untuk mahasiswa (edit mandiri lewat portal) — hanya boleh diubah
// BAAK/Prodi lewat PUT /mahasiswa/:id/biodata. NIM ada di tabel mahasiswa, tidak lewat sini.
const BIODATA_LOCKED_FOR_MAHASISWA = [
  'kelas',
  'jalurPendaftaran',
  'jenisPendaftaran',
  'tanggalMasukKuliah',
  'mulaiSemester',
  'programStudi',
  'statusBelajar',
  'statusKuliah',
  'statusDikti',
  // Data pembiayaan dikelola BAAK/Keuangan, tidak ditampilkan & tidak bisa diubah dari portal mahasiswa.
  'jenisPembiayaan',
  'biayaMasuk',
  // Data transfer (SKS diakui, PT & prodi asal) dikelola BAAK, tidak ditampilkan di portal mahasiswa.
  'sksDiakui',
  'perguruanTinggiAsal',
  'programStudiAsal',
];

// Dipakai portal mahasiswa: field terkunci di-strip (bukan error) supaya client yang mengirim
// seluruh form tetap lolos, tapi nilainya tidak pernah tersimpan.
const saveBiodataSendiri = saveMahasiswaBiodata.fork(BIODATA_LOCKED_FOR_MAHASISWA, (schema) => schema.strip());

module.exports = { saveMahasiswaBiodata, saveBiodataSendiri, BIODATA_LOCKED_FOR_MAHASISWA };
