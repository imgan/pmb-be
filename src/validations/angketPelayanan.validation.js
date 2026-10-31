const Joi = require('joi');

// mahasiswaId TIDAK ada di sini — selalu diisi dari req.mahasiswa.id di controller.
const submit = Joi.object({
  tahunAjaranId: Joi.number().integer().required(),
  jawaban: Joi.array()
    .items(
      Joi.object({
        pertanyaanId: Joi.number().integer().required(),
        skor: Joi.number().integer().min(1).max(5).required(),
      })
    )
    .unique('pertanyaanId')
    .min(1)
    .required(),
  saran: Joi.string().max(2000).allow('', null),
});

module.exports = { submit };
