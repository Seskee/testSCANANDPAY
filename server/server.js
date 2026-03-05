// server/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Import middleware-a
const { apiLimiter, authLimiter } = require('./routes/middleware/rateLimiter');
const { connectDB } = require("./config/database");

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

// Provjera environment varijabli
if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL variable in .env missing.");
  process.exit(-1);
}
if (!process.env.JWT_SECRET) {
  console.error("Error: JWT_SECRET variable in .env missing.");
  process.exit(-1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE KONFIGURACIJA ---

// 1. STRIPE WEBHOOK (Mora biti prvi i koristiti express.raw)
app.use("/webhooks", express.raw({ type: 'application/json' }), stripeWebhookRoutes);

// 2. CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// 3. RATE LIMITING (Sigurnost)
app.use('/api', apiLimiter); // Općeniti limiter za sav API
app.use('/api/auth/login', authLimiter);    // DODANO: Specifična zaštita od Brute Force-a
app.use('/api/auth/register', authLimiter); // DODANO: Zaštita od botova na registraciji

// 4. PARSERI (Nakon webhooka!)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- RUTE ---

// Montiranje ruta s prefiksima radi preglednosti
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/qrcodes', qrCodeRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/', basicRoutes);

// --- ERROR HANDLING ---

app.use((req, res) => res.status(404).json({ error: "Page not found." }));

app.use((err, req, res, next) => {
  console.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: process.env.NODE_ENV === 'development' ? err.message : "Something went wrong." 
  });
});

// --- POKRETANJE ---

connectDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`🔒 Rate Limiters active on Auth routes`);
    });
  })
  .catch(err => {
    console.error("❌ Failed to connect to the database", err);
    process.exit(1);
  });