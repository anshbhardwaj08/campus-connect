const Joi = require('joi');

const createListingSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).required(),
  description: Joi.string().trim().min(10).max(3000).required(),
  price: Joi.number().min(0).required(),
  isNegotiable: Joi.boolean(),
  isFree: Joi.boolean(),
  category: Joi.string().required(),
  subCategory: Joi.string().allow(''),
  condition: Joi.string().valid('new', 'like-new', 'used', 'for-parts').required(),
  pickupLocation: Joi.string().allow(''),
});

const updateListingSchema = createListingSchema.fork(
  ['title', 'description', 'price', 'category', 'condition'],
  (schema) => schema.optional()
);

module.exports = { createListingSchema, updateListingSchema };
