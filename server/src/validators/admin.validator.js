const Joi = require('joi');

// createCategory used to spread `req.body` straight into `Category.create`,
// the same gap fixed for the community handlers — see
// community.validator.js. `parentId` and `customFields` are left off this
// allow-list until CategoryManager actually needs them.
const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required(),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9-]+$/)
    .min(2)
    .max(60)
    .required(),
  icon: Joi.string().trim().max(60).allow(''),
  order: Joi.number().integer().min(0),
});

module.exports = { createCategorySchema };
