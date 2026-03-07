// server/config/redis.js
const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    // Ako REDIS_URL nije definiran u .env, preskačemo spajanje (fallback na RAM)
    if (!process.env.REDIS_URL) {
      logger.warn('⚠️ REDIS_URL nije definiran. Rate limiting i cache će koristiti radnu memoriju (RAM).');
      return null;
    }

    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('❌ Redis se ne može spojiti nakon 10 pokušaja. Prekidam reconnect.');
            return new Error('Redis max retries reached');
          }
          return Math.min(retries * 100, 3000); // Raste vrijeme čekanja do 3 sekunde
        }
      }
    });

    redisClient.on('error', (err) => logger.error(`❌ Redis Error: ${err.message}`));
    redisClient.on('connect', () => logger.info('✅ Redis spojen uspješno.'));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error(`❌ Greška pri spajanju na Redis: ${error.message}`);
    redisClient = null; // Aplikacija nastavlja raditi i bez Redisa
  }
};

const getRedis = () => {
  return redisClient;
};

module.exports = { connectRedis, getRedis };