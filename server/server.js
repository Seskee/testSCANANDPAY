// server/server.js
require("dotenv").config();
require("express-async-errors"); // SIGURNOSNI DODATAK: Hvata asinkrone greške da spriječi rušenje
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const xss = require("xss-clean");
const hpp = require("hpp");
const compression = require("compression");

// Import utilita
const logger = require('./utils/logger');
const { connectDB, closeDB } = require("./config/database"); // DODAN closeDB
const { connectRedis } = require("./config/redis");
const { apiLimiter, authLimiter } = require('./routes/middleware/rateLimiter');

// Import ruta
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

// 1. STRIPE WEBHOOK
app.use("/webhooks", express.raw({ type: 'application/json' }), stripeWebhookRoutes);

// 2. GLOBALNI MIDDLEWARE
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

// HTTP Request Logger Middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// 3. RUTE
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/qrcodes', qrCodeRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/', basicRoutes);

// 4. ERROR HANDLING
app.use((req, res) => res.status(404).json({ error: "Endpoint not found." }));

app.use((err, req, res, next) => {
  logger.error(`[ERROR] ${err.name}: ${err.message}`);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: "Payload too large. Maximum size is 10kb." });
  }
  res.status(err.statusCode || 500).json({ 
    error: "Internal Server Error", 
    message: process.env.NODE_ENV === 'development' ? err.message : "Something went wrong." 
  });
});

// 5. POKRETANJE SERVERA (S DODANIM GRACEFUL SHUTDOWNOM)
let server;
const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running at http://localhost:${PORT}`);
      logger.info(`🔒 Enterprise Security Active (Helmet, XSS, HPP, Redis Cache)`);
    });

    process.on('unhandledRejection', (err) => {
      logger.fatal(`UNHANDLED REJECTION! 💥 ${err.name}: ${err.message}`);
    });
  } catch (err) {
    logger.fatal(`❌ Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

// GRACEFUL SHUTDOWN - OBAVEZNO ZA FINANCIJE
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      // Ovdje gasimo bazu sigurno kako transakcije ne bi ostale visiti
      await closeDB();
      logger.info('Database connections closed.');
      process.exit(0);
    });

    // Force shutdown nakon 10 sekundi ako zahtjevi zapnu
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();