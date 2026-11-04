const Joi = require('joi');

const createPembayaran = Joi.object({
  mahasiswaId: Joi.number().integer().required(),
  // Tidak dipakai lagi: tagihan & periodenya ditentukan server dari hasil generate (dibiarkan agar form lama tetap jalan).
  periode: Joi.number().integer().allow(null),
  tanggalBayar: Joi.date().required(),
  noBukti: Joi.string().max(50).required(),
  nominal: Joi.number().positive().required(),
  kodeBank: Joi.string().max(30).allow('', null),
  keterangan: Joi.string().max(150).allow('', null),
});

const generateTagihan = Joi.object({
  tahunTaSkripsiId: Joi.number().integer().required(),
  // true = hanya hitung, belum menyimpan.
  pratinjau: Joi.boolean().default(false),
  // Opsional: buat jadwal cicilan untuk tagihan yang belum punya jadwal & belum dibayar.
  cicilan: Joi.object({
    jumlahBulan: Joi.number().integer().min(1).max(24).required(),
    bulanMulai: Joi.string().pattern(/^\d{4}-\d{2}$/).required().messages({ 'string.pattern.base': 'Bulan mulai harus berformat YYYY-MM' }),
    hariJatuhTempo: Joi.number().integer().min(1).max(31).allow(null),
  }).allow(null),
});

module.exports = { createPembayaran, generateTagihan };
