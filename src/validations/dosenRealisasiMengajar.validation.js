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
  savePresensiMahasiswa,
};
