const Joi = require('joi');

// mahasiswaId & tahun ajaran TIDAK dari client — diisi dari req.mahasiswa & tahun ajaran aktif di service.
const saveKkp = Joi.object({
  judul: Joi.string().trim().max(2000).required().messages({ 'any.required': 'Judul KKP wajib diisi', 'string.empty': 'Judul KKP wajib diisi' }),
  perusahaan: Joi.string().trim().max(200).required().messages({ 'any.required': 'Perusahaan wajib diisi', 'string.empty': 'Perusahaan wajib diisi' }),
  alamat: Joi.string().trim().allow('', null),
  email: Joi.string().trim().email().max(150).allow('', null).messages({ 'string.email': 'E-Mail tidak valid' }),
  telepon: Joi.string().trim().pattern(/^[0-9+()\-\s]{5,30}$/).allow('', null).messages({ 'string.pattern.base': 'Telepon tidak valid' }),
  pembimbingMagangId: Joi.number().integer().allow(null),
  semester: Joi.number().integer().min(1).max(14).required().messages({ 'any.required': 'Semester wajib dipilih' }),
});

module.exports = { saveKkp };
