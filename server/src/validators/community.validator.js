const Joi = require('joi');

// The community create handlers spread `req.body` straight into the model
// (`{ ...req.body, userId: req.user._id }`). Mongoose drops keys the schema
// does not know, but every field the schema DOES know was reachable — so a
// client could post an event that already claims 400 RSVPs, a lost-item
// report pre-marked resolved, or a want that never expires.
//
// These schemas are the allow-list. `validate()` runs with stripUnknown, so
// anything not named here is quietly discarded before it reaches the model.
// Server-owned fields — status, rsvpCount, expiresAt, userId, organizerId —
// are deliberately absent.

const createEventSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).required(),
  description: Joi.string().trim().max(3000).allow(''),
  date: Joi.date().required(),
  location: Joi.string().trim().max(200).allow(''),
  category: Joi.string().trim().max(60).allow(''),
  isFree: Joi.boolean(),
  ticketPrice: Joi.number().min(0),
  // Optional: most campus events are "turn up". A number here caps the list.
  capacity: Joi.number().integer().min(1).max(100000),
});

const createLostFoundSchema = Joi.object({
  type: Joi.string().valid('lost', 'found').required(),
  title: Joi.string().trim().min(3).max(150).required(),
  description: Joi.string().trim().max(3000).allow(''),
  location: Joi.string().trim().max(200).allow(''),
  date: Joi.date(),
});

const createCarpoolSchema = Joi.object({
  from: Joi.string().trim().min(2).max(120).required(),
  to: Joi.string().trim().min(2).max(120).required(),
  departureDate: Joi.date().required(),
  seatsAvailable: Joi.number().integer().min(0).max(20).required(),
  contactInfo: Joi.string().trim().min(5).max(120).required(),
});

const createLookingForSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).required(),
  description: Joi.string().trim().max(3000).allow(''),
  category: Joi.string().trim().max(60).allow(''),
  // Defaulted here as well as on the model, so a post that goes through the
  // API always carries the field explicitly — `matchers/candidates.js` reads
  // it on documents fetched with `.lean()`, where Mongoose defaults do not
  // apply.
  listingType: Joi.string().valid('sale', 'rent').default('sale'),
  // Only means anything alongside `rent`. Stripped rather than rejected on a
  // sale: a form that leaves the period control mounted while someone
  // switches back to buying should not get a 400 for it.
  rentPeriod: Joi.string()
    .valid('day', 'week', 'month')
    .when('listingType', { is: 'rent', otherwise: Joi.any().strip() }),
  maxBudget: Joi.number().min(0),
});

module.exports = {
  createEventSchema,
  createLostFoundSchema,
  createCarpoolSchema,
  createLookingForSchema,
};
