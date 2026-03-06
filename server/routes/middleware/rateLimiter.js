// server/routes/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { getRedis } = require('../../config/redis'); // Uvozimo Redis klijent

// Pomoćna funkcija koja aktivira Redis ako je dostupan, inače pada nazad na memoriju
const createLimiter = (options) => {
  const redisClient = getRedis();
  
  if (redisClient) {
    options.store = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    });
  }
  
  return rateLimit(options);
};

// Globalni API Limiter (Sprječava DDoS na bazu)
const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 300, // max 300 requesta po IP-u
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Previše zahtjeva. Pokušajte kasnije.',
  },
});

// Autentifikacijski Limiter (Sprječava Brute-Force hakiranje lozinki)
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 10, // samo 10 pokušaja prijave
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