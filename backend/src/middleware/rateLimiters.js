const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 15,             // limit each IP to 15 requests per window
  standardHeaders: true, // return rate limit info in RateLimit-* headers
  legacyHeaders: false,  // disable X-RateLimit-* headers
  message: { error: 'Too many requests. Please slow down.' }
});

module.exports = { authLimiter };
