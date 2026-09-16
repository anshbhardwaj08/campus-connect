const Joi = require('joi');

const createListingSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).required(),
  description: Joi.string().trim().min(10).max(3000).required(),
  // No Joi default — the model defaults to 'sale'. A default here would
  // collide with making this required on update.
  listingType: Joi.string().valid('sale', 'rent'),
  // For a rental this is the rate per period.
  price: Joi.number().min(0).required(),
  // Required for a rental and refused on a sale, so a sale listing can never
  // end up carrying a stray "per month" that the UI would then print.
  rentPeriod: Joi.string()
    .valid('day', 'week', 'month')
    .when('listingType', {
      is: 'rent',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
  securityDeposit: Joi.number().min(0).when('listingType', {
    is: 'rent',
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
  isNegotiable: Joi.boolean(),
  isFree: Joi.boolean(),
  category: Joi.string().required(),
  subCategory: Joi.string().allow(''),
  condition: Joi.string().valid('new', 'like-new', 'used', 'for-parts').required(),
  pickupLocation: Joi.string().allow(''),
});

const updateListingSchema = createListingSchema
  .fork(['title', 'description', 'price', 'category', 'condition'], (schema) => schema.optional())
  // An edit has to restate which kind of listing this is. Left out, the
  // rent rules below have nothing to test against, and any edit to an
  // unrelated field would strip a rental's period and deposit.
  .fork(['listingType'], (schema) => schema.required());

module.exports = { createListingSchema, updateListingSchema };
