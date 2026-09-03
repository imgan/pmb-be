const Joi = require('joi');

// Login boleh pakai NIDN atau email, keduanya opsional asal salah satu diisi.
const loginDosen = Joi.object({
  nidn: Joi.string().max(20),
  email: Joi.string().email(),
  password: Joi.string().required(),
})
  .xor('nidn', 'email')
  .messages({ 'object.xor': 'Isi salah satu dari NIDN atau email' });

module.exports = {
  loginDosen,
};
