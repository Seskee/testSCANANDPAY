// server/routes/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { getRedis } = require('../../config/redis');

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
  max: 300,
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
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Previše pokušaja prijave. Pokušajte kasnije.',
  },
});

// 🔒 NOVO: Payment Limiter — štiti javnu /payments/create rutu od zlouporabe
// Gost može pokušati platiti max 10 puta u minuti po IP-u
const paymentLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minuta
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_PAYMENT_ATTEMPTS',
    message: 'Previše pokušaja plaćanja. Pričekajte minutu i pokušajte ponovo.',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  paymentLimiter,
};