const Joi = require('joi');

// `submitReport` spread `req.body` straight into `Report.create`, so a
// client could file a report that arrived pre-`resolved`, carrying its own
// `adminNote` and a `resolvedBy` pointing at whoever it liked — on the one
// queue moderators are meant to trust. Same gap as the community handlers;
// same fix.
//
// Server-owned fields (`status`, `adminNote`, `resolvedBy`, `reporterId`)
// are deliberately absent, and `validate()` runs with stripUnknown.
const createReportSchema = Joi.object({
  targetType: Joi.string().valid('listing', 'user', 'message').required(),
  targetId: Joi.string().hex().length(24).required(),
  reason: Joi.string().trim().min(3).max(120).required(),
  description: Joi.string().trim().max(1000).allow(''),
});

module.exports = { createReportSchema };
