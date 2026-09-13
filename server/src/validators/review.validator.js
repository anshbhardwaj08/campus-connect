const Joi = require('joi');

const createReviewSchema = Joi.object({
  revieweeId: Joi.string().required(),
  listingId: Joi.string().allow(null, ''),
  dealId: Joi.string().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(1000).allow(''),
  type: Joi.string().valid('buyer', 'seller').required(),
});

module.exports = { createReviewSchema };
