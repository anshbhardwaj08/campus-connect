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
  maxBudget: Joi.number().min(0),
});

module.exports = {
  createEventSchema,
  createLostFoundSchema,
  createCarpoolSchema,
  createLookingForSchema,
};
