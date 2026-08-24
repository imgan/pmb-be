const Joi = require('joi');

const updateHomeImages = Joi.object({
  heroImage: Joi.string().allow('', null),
  programStudiImage: Joi.string().allow('', null),
  kehidupanKampusImage: Joi.string().allow('', null),
  fasilitasLabImage: Joi.string().allow('', null),
  fasilitasGedungImage: Joi.string().allow('', null),
  fasilitasAulaImage: Joi.string().allow('', null),
  beasiswaSlide1Image: Joi.string().allow('', null),
  beasiswaSlide2Image: Joi.string().allow('', null),
}).min(1);

module.exports = { updateHomeImages };
