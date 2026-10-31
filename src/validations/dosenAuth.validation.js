const Joi = require('joi');

// Login pakai NIP (NIDN/email tetap diterima), cukup salah satu.
const loginDosen = Joi.object({
  nip: Joi.string().max(20),
  nidn: Joi.string().max(20),
  email: Joi.string().email(),
  password: Joi.string().required(),
})
  .xor('nip', 'nidn', 'email')
  .messages({ 'object.xor': 'Isi NIP' });

const updatePhotoDosen = Joi.object({ photo: Joi.string().allow('', null).required() });

const changePasswordDosen = Joi.object({
  oldPassword: Joi.string().required().messages({ 'any.required': 'Password lama wajib diisi' }),
  newPassword: Joi.string().min(8).max(100).required().messages({ 'string.min': 'Password baru minimal 8 karakter' }),
});

module.exports = {
  loginDosen,
  updatePhotoDosen,
  changePasswordDosen,
};
