const Joi = require('joi');

const timeString = Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/);

const createRealisasiMengajar = Joi.object({
  jadwalKuliahId: Joi.number().integer().required(),
  tanggalRealisasi: Joi.date().iso().required(),
  jamMasuk: timeString.required(),
  jamKeluar: timeString.required(),
  pertemuanKe: Joi.number().integer().min(1).max(16).required(),
  status: Joi.string().valid('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT').required(),
  keterangan: Joi.string().allow('', null),
  uraian: Joi.string().allow('', null),
});

// Edit realisasi: semua field opsional, jamKeluar boleh dikosongkan (kelas yang belum di-stop).
const updateRealisasiMengajar = Joi.object({
  jadwalKuliahId: Joi.number().integer(),
  tanggalRealisasi: Joi.date().iso(),
  jamMasuk: timeString,
  jamKeluar: timeString.allow(null, ''),
  pertemuanKe: Joi.number().integer().min(1).max(16),
  status: Joi.string().valid('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT'),
  keterangan: Joi.string().allow('', null),
  uraian: Joi.string().allow('', null),
}).min(1);

const startKelas = Joi.object({
  jadwalKuliahId: Joi.number().integer().required(),
  pertemuanKe: Joi.number().integer().min(1).max(16).allow(null),
  uraian: Joi.string().allow('', null),
  keterangan: Joi.string().allow('', null),
});

const stopKelas = Joi.object({
  uraian: Joi.string().allow('', null),
  keterangan: Joi.string().allow('', null),
});

const savePresensiMahasiswa = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        mahasiswaId: Joi.number().integer().required(),
        status: Joi.string().valid('HADIR', 'IZIN', 'SAKIT', 'ALPA').required(),
        keterangan: Joi.string().allow('', null),
      })
    )
    .min(1)
    .required(),
});

module.exports = {
  createRealisasiMengajar,
  updateRealisasiMengajar,
  startKelas,
  stopKelas,
  savePresensiMahasiswa,
};
