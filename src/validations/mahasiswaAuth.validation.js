const Joi = require('joi');

// Login boleh pakai NIM atau email, keduanya opsional asal salah satu diisi.
const loginMahasiswa = Joi.object({
  nim: Joi.string().max(30),
  email: Joi.string().email(),
  password: Joi.string().required(),
})
  .xor('nim', 'email')
  .messages({ 'object.xor': 'Isi salah satu dari NIM atau email' });

const updateProfile = Joi.object({
  photo: Joi.string().allow('', null),
}).min(1);

const changePassword = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

module.exports = {
  loginMahasiswa,
  updateProfile,
  changePassword,
};
