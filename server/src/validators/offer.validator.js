const Joi = require('joi');

const sendOfferSchema = Joi.object({
  conversationId: Joi.string().required(),
  listingId: Joi.string().required(),
  amount: Joi.number().min(0).required(),
});

const counterOfferSchema = Joi.object({
  counterAmount: Joi.number().min(0).required(),
});

module.exports = { sendOfferSchema, counterOfferSchema };
