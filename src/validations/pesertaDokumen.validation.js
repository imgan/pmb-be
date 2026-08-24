const Joi = require('joi');

const FILE_PATTERN = /^data:(application\/pdf|image\/png|image\/jpeg);base64,/;

const uploadDokumen = Joi.object({
  fileName: Joi.string().max(255).required(),
  file: Joi.string()
    .pattern(FILE_PATTERN)
    .required()
    .messages({ 'string.pattern.base': 'File harus berformat PDF, PNG, atau JPEG' }),
});

module.exports = { uploadDokumen };
