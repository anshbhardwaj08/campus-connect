const Joi = require('joi');

// revieweeId, listingId and type are deliberately NOT accepted here — the
// controller derives them from the deal so they cannot be spoofed. validate()
// runs with stripUnknown, so sending them is harmless but pointless.
const createReviewSchema = Joi.object({
  dealId: Joi.string().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(1000).allow(''),
});

module.exports = { createReviewSchema };
