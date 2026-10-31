const Joi = require('joi');

const nilai = Joi.number().min(0).max(100).allow(null);

const saveNilaiKelas = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        mahasiswaId: Joi.number().integer().required(),
        partisipatif: nilai,
        tugas: nilai,
        quiz: nilai,
        proyek: nilai,
        uts: nilai,
        uas: nilai,
      })
    )
    .min(1)
    .required(),
});

/** Bobot OBE kelas (%), total 100 dicek di service. */
const bobotObe = Joi.object({
  komponenEvaluasi: Joi.array()
    .min(1)
    .max(30)
    .required()
    .items(
      Joi.object({
        metode: Joi.string().trim().max(100).required(),
        jenis: Joi.string().valid('partisipatif', 'tugas', 'quiz', 'proyek', 'uts', 'uas').required(),
        bobot: Joi.number().greater(0).max(100).precision(2).required(),
        syaratLulus: Joi.boolean().default(false),
        // Opsional (Komposisi Nilai Kelas, berelasi ke CPMK RPS): nilai per CPMK ({ cpmkId: % nilai akhir })
        // dan sub metode (bobot = % dari metode induk; nilai CPMK di sub bila ada sub).
        cpmk: Joi.object().pattern(/^\d+$/, Joi.number().min(0).max(100)).allow(null),
        sub: Joi.array()
          .max(20)
          .items(
            Joi.object({
              nama: Joi.string().trim().max(150).required(),
              bobot: Joi.number().min(0).max(100).precision(2).required(),
              cpmk: Joi.object().pattern(/^\d+$/, Joi.number().min(0).max(100)).allow(null),
            })
          )
          .allow(null),
      })
    ),
  keterangan: Joi.string().trim().max(2000).allow('', null),
});

/** Nilai kelas OBE per sel komponen × CPMK: nilai = { kunci ("1|<cpmkId>" / "1.2|<cpmkId>", atau "1" bila MK tanpa CPMK): 0–100 | null }. */
const saveNilaiObe = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        mahasiswaId: Joi.number().integer().required(),
        nilai: Joi.object().pattern(/^\d+(\.\d+)?(\|\d+)?$/, nilai).required(),
      })
    )
    .min(1)
    .required(),
});

module.exports = { saveNilaiKelas, saveNilaiObe, bobotObe };
