const Joi = require('joi');

const assignPermissions = Joi.object({
  permissions: Joi.array()
    .items(
      Joi.object({
        menuId: Joi.number().integer().required(),
        canCreate: Joi.boolean().default(false),
        canRead: Joi.boolean().default(false),
        canUpdate: Joi.boolean().default(false),
        canDelete: Joi.boolean().default(false),
      })
    )
    .min(1)
    .required(),
});

module.exports = { assignPermissions };
