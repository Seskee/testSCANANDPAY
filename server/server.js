// server/server.js
require("dotenv").config();
require("express-async-errors");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const xss = require("xss-clean");
const hpp = require("hpp");
const compression = require("compression");

const logger = require('./utils/logger');
const { connectDB, closeDB, getDB } = require("./config/database"); 
const { connectRedis } = require("./config/redis");
const { apiLimiter, authLimiter } = require('./routes/middleware/rateLimiter');

const stripeWebhookRoutes = require("./routes/stripeWebhookRoutes");
const basicRoutes = require("./routes/index");
const authRoutes = require("./routes/authRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const billRoutes = require("./routes/billRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const qrCodeRoutes = require("./routes/qrCodeRoutes");
const receiptRoutes = require("./routes/receiptRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  logger.fatal("CRITICAL: Missing DATABASE_URL or JWT_SECRET in .env");
  process.exit(-1);
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

app.use("/webhooks", express.raw({ type: 'application/json' }), stripeWebhookRoutes);

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods:['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders:['Content-Type', 'Authorization', 'idempotency-key']
}));

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(xss());
app.use(hpp());
app.use(compression());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/qrcodes', qrCodeRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/', basicRoutes);

app.use((req, res) => res.status(404).json({ error: "Endpoint not found." }));

app.use((err, req, res, next) => {
  logger.error(`[ERROR] ${err.name}: ${err.message}`);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: "Payload too large. Maximum size is 10kb." });
  }

  let clientMessage = "Something went wrong.";
  if (process.env.NODE_ENV === 'development') {
      clientMessage = err.message;
  } else if (err.message && !err.message.toLowerCase().includes('syntax') && !err.message.toLowerCase().includes('relation') && !err.message.toLowerCase().includes('database')) {
      clientMessage = err.message;
  }

  res.status(err.statusCode || 500).json({ 
    error: "Internal Server Error", 
    message: clientMessage 
  });
});

let server;
let backgroundWorker;

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running at http://localhost:${PORT}`);
      logger.info(`🔒 Enterprise Security Active (Helmet, XSS, HPP, Redis Cache)`);
    });

    // BANK-GRADE: Background Worker za čišćenje baze (sprječava zaključavanje stolova)
    backgroundWorker = setInterval(async () => {
      try {
        const db = getDB();
        const cleared = await db.cleanupStalePayments();
        const closed = await db.autoClosePaidBills();
        if (cleared > 0 || closed > 0) {
          logger.info(`🧹 DB Cleanup: Cleared ${cleared} stale payments, Closed ${closed} fully paid bills.`);
        }
      } catch (err) {
        logger.error(`DB Cleanup Task Error: ${err.message}`);
      }
    }, 5 * 60 * 1000); // Svakih 5 minuta

    process.on('unhandledRejection', (err) => {
      logger.fatal(`UNHANDLED REJECTION! 💥 ${err.name}: ${err.message}`);
    });
  } catch (err) {
    logger.fatal(`❌ Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (backgroundWorker) clearInterval(backgroundWorker); // Zaustavi workera
  
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      await closeDB();
      logger.info('Database connections closed.');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();