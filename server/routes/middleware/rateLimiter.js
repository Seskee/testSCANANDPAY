const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Previše zahtjeva. Pokušajte kasnije.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Previše pokušaja prijave. Pokušajte kasnije.',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
