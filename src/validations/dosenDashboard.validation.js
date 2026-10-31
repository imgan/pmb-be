const Joi = require('joi');

const noHp = (label) =>
  Joi.string()
    .trim()
    .pattern(/^\+?[0-9\s-]{8,20}$/)
    .allow('', null)
    .messages({ 'string.pattern.base': `${label} hanya boleh angka (8-20 digit, boleh diawali +)` });

/** Data pribadi & kontak yang boleh diubah dosen sendiri. */
const updateBiodataDosen = Joi.object({
  tempatLahir: Joi.string().trim().max(100).allow('', null),
  tanggalLahir: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null).messages({ 'string.pattern.base': 'Tanggal lahir tidak valid' }),
  jenisKelamin: Joi.string().valid('L', 'P').allow('', null),
  agama: Joi.string().trim().max(50).allow('', null),
  email: Joi.string().trim().email().max(150).allow('', null).messages({ 'string.email': 'Format email tidak valid' }),
  alamat: Joi.string().trim().max(1000).allow('', null),
  telpHp: noHp('No Telp'),
  noWhatsapp: noHp('No WhatsApp'),
  pendidikanAkhir: Joi.string().trim().max(50).allow('', null),
}).min(1);

const riwayatPendidikan = Joi.object({
  perguruanTinggi: Joi.string().trim().max(200).required().messages({ 'any.required': 'Perguruan tinggi wajib diisi' }),
  jenjang: Joi.string().trim().max(20).required().messages({ 'any.required': 'Jenjang wajib diisi' }),
  programStudi: Joi.string().trim().max(150).allow('', null),
  gelar: Joi.string().trim().max(50).allow('', null),
  tahunLulus: Joi.number().integer().min(1950).max(2100).allow(null),
  noIjazah: Joi.string().trim().max(100).allow('', null),
});

module.exports = { updateBiodataDosen, riwayatPendidikan };
