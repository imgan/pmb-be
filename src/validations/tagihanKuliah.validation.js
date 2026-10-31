const Joi = require('joi');

const generateTagihan = Joi.object({
  tahunAjaranId: Joi.number().integer().required(),
});

const importTagihan = Joi.object({
  file: Joi.string().required(),
  fileName: Joi.string().max(255).allow('', null),
});

/** Edit manual satu tagihan (nominal sebelum potongan, total bayar menurut keuangan, dst). */
const updateTagihan = Joi.object({
  tagihanAwal: Joi.number().min(0),
  totalBayarImport: Joi.number().min(0),
  tanggalJatuhTempo: Joi.date().iso().allow(null),
  noVirtualAccount: Joi.string().trim().pattern(/^[0-9]+$/).max(30).allow('', null).messages({
    'string.pattern.base': 'No Virtual Account hanya boleh berisi angka',
  }),
  keterangan: Joi.string().max(255).allow('', null),
}).min(1);

const noVa = Joi.string().trim().pattern(/^[0-9]+$/).max(30).allow('', null).messages({
  'string.pattern.base': 'No Virtual Account hanya boleh berisi angka',
});

/** Ganti seluruh cicilan satu tagihan; array kosong = hapus cicilan. */
const saveCicilan = Joi.object({
  cicilan: Joi.array()
    .items(
      Joi.object({
        periode: Joi.string().pattern(/^\d{4}-\d{2}(-\d{2})?$/).required().messages({ 'string.pattern.base': 'Bulan cicilan tidak valid' }),
        nominal: Joi.number().min(0).required(),
        tanggalJatuhTempo: Joi.date().iso().allow(null, ''),
        noVirtualAccount: noVa,
        keterangan: Joi.string().max(255).allow('', null),
      })
    )
    .max(24)
    .required(),
});

const generateCicilan = Joi.object({
  tahunAjaranId: Joi.number().integer().required(),
  jurusanId: Joi.number().integer().allow(null),
  jumlahBulan: Joi.number().integer().min(1).max(12).required(),
  bulanMulai: Joi.string().pattern(/^\d{4}-\d{2}$/).required().messages({ 'string.pattern.base': 'Bulan mulai tidak valid' }),
  hariJatuhTempo: Joi.number().integer().min(1).max(31).allow(null),
  timpa: Joi.boolean().default(false),
});

module.exports = { generateTagihan, importTagihan, updateTagihan, saveCicilan, generateCicilan };
