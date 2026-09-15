const rateLimit = require('express-rate-limit');

// General API traffic.
//
// This was 100 per 15 minutes, which real browsing blows through: one page
// load fires roughly four requests (session check, listings, conversations,
// saved items), so a student clicking around for ten minutes would start
// getting 429s. Observed during testing.
//
// 600 per 15 minutes is ~40/minute per IP — still far below what scraping
// needs, but well clear of ordinary use. Note this is per IP, so a whole
// hostel behind one NAT shares the bucket; raise it if that bites.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

// Credential endpoints get their own, much tighter bucket.
//
// Previously login and register shared the general limit, which meant an
// attacker got 100 password guesses per window. Failed attempts are what
// matter here, so successful logins are not counted — someone signing in
// normally is never affected by this.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Wait fifteen minutes and try again.',
  },
});

module.exports = apiLimiter;
module.exports.apiLimiter = apiLimiter;
module.exports.authLimiter = authLimiter;
