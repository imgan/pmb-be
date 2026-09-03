const Joi = require('joi');
const { JENIS_SURAT_VALUES } = require('./suratKeterangan.validation');

// `semester` sengaja TIDAK ada di sini — semester KRS tidak boleh dipilih manual oleh mahasiswa,
// selalu dihitung otomatis di service dari periode masuk vs periode berjalan
// (lihat mahasiswaPortal.service.js#getSemesterBerjalan & utils/hitungSemester.js).
const saveKrsDraft = Joi.object({
  tahunAjaranId: Joi.number().integer().required(),
  jadwalKuliahIds: Joi.array().items(Joi.number().integer()).default([]),
});

// mahasiswaId TIDAK ada di sini — selalu diisi dari req.mahasiswa.id di service, bukan dari client.
const createSuratRequest = Joi.object({
  jenisSurat: Joi.string()
    .valid(...JENIS_SURAT_VALUES)
    .required(),
  semester: Joi.number().integer().min(1).max(20).allow(null),
  alasan: Joi.string().allow('', null),
  namaInstansi: Joi.string().max(255).allow('', null),
  alamatInstansi: Joi.string().allow('', null),
  ipk: Joi.number().min(0).max(4).allow(null),
  jumlahSks: Joi.number().integer().min(0).allow(null),
  namaKoordinator: Joi.string().max(150).allow('', null),
  noHpKoordinator: Joi.string().max(30).allow('', null),
  tanggalUjianMulai: Joi.date().allow(null),
  tanggalUjianSelesai: Joi.date().allow(null),
});

module.exports = { saveKrsDraft, createSuratRequest };
