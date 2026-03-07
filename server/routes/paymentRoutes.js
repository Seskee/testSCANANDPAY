// server/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const paymentService = require('../services/paymentService');
const { authenticateToken } = require('./middleware/auth');
const { getDB } = require('../config/database');
const { requireRestaurantOwnership } = require('./middleware/ownershipMiddleware');
// 🔒 NOVO: Uvozimo paymentLimiter
const { paymentLimiter } = require('./middleware/rateLimiter');

// HELPER: Sigurnosna provjera vlasništva restorana nad uplatom
const verifyPaymentOwnership = async (paymentId, userId) => {
  const db = getDB();
  const payment = await db.getPaymentById(paymentId);
  if (!payment) throw new Error('Payment not found');
  const restaurant = await db.getRestaurantById(payment.restaurant_id);
  if (!restaurant || restaurant.owner_id.toString() !== userId.toString()) {
    throw new Error('Unauthorized access to this payment');
  }
  return true;
};

// 🔒 GDPR: Validacija email formata
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
};

// PUBLIC RUTA — 🔒 ZAŠTIĆENA rate limiterom + GDPR validacijom
router.post('/create', paymentLimiter, async (req, res) => {
  try {
    const { billId, items, tip, paymentMethod, customerEmail, gdprConsent } = req.body;

    if (tip !== undefined && (typeof tip !== 'number' || tip < 0 || tip > 10000)) {
      return res.status(400).json({ error: 'Tip must be a valid positive number' });
    }

    // 🔒 GDPR (Uredba EU 2016/679, čl. 6 i 7):
    // Email smijemo pohraniti SAMO uz eksplicitnu privolu gosta.
    // Ako je email poslan bez gdprConsent: true — odbijamo zahtjev.
    if (customerEmail) {
      if (!isValidEmail(customerEmail)) {
        return res.status(400).json({ error: 'Invalid email address format' });
      }
      if (!gdprConsent) {
        return res.status(400).json({
          error: 'GDPR_CONSENT_REQUIRED',
          message: 'Explicit consent is required to store your email address for receipt delivery.'
        });
      }
    }

    // Ako nema privole ili emaila — pohranimo null (ne smijemo čuvati bez privole)
    const emailToStore = (customerEmail && gdprConsent) ? customerEmail.trim() : null;

    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;
    if (!idempotencyKey && (!billId || !billId.startsWith('demo-'))) {
      return res.status(400).json({ error: 'Idempotency key is required' });
    }

    if (process.env.ENABLE_DEMO_MODE === 'true' && billId && billId.startsWith('demo-')) {
      const mockAmount = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
      return res.status(201).json({
        paymentId: 'demo-payment-' + Date.now(),
        clientSecret: 'demo_secret_' + randomUUID(),
        amount: mockAmount,
        totalAmount: mockAmount + (tip || 0),
        currency: 'eur', demo: true
      });
    }

    const result = await paymentService.createPayment(billId, { items, tip, paymentMethod, customerEmail: emailToStore, idempotencyKey });
    res.status(201).json({
      paymentId: result.payment._id || result.payment.id,
      clientSecret: result.clientSecret,
      amount: result.payment.amount,
      totalAmount: result.payment.totalAmount,
      currency: result.payment.currency
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUBLIC RUTA
router.post('/confirm/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (process.env.ENABLE_DEMO_MODE === 'true' && paymentId && paymentId.startsWith('demo-payment-')) {
      return res.status(200).json({ success: true, status: 'succeeded', payment: { id: paymentId, status: 'succeeded', demo: true } });
    }
    const payment = await paymentService.confirmPayment(paymentId);
    res.status(200).json({ success: payment.status === 'succeeded', status: payment.status, payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUBLIC RUTA
router.get('/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (process.env.ENABLE_DEMO_MODE === 'true' && paymentId && paymentId.startsWith('demo-payment-')) {
      return res.status(200).json({ status: 'succeeded' });
    }
    const db = getDB();
    const payment = await db.queryOne('SELECT status FROM payments WHERE id = $1', [paymentId]);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.status(200).json({ status: payment.status });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PRIVATE RUTA - IDOR ZAŠTIĆENA
router.get('/:paymentId', authenticateToken, async (req, res) => {
  try {
    await verifyPaymentOwnership(req.params.paymentId, req.user._id);
    const payment = await paymentService.getPaymentById(req.params.paymentId);
    res.status(200).json({ payment });
  } catch (error) {
    res.status(error.message.includes('Unauthorized') ? 403 : 500).json({ error: error.message });
  }
});

// PRIVATE RUTA - IDOR ZAŠTIĆENA (Kroz middleware jer koristimo restaurantId param)
router.get('/restaurant/:restaurantId', authenticateToken, requireRestaurantOwnership, async (req, res) => {
  try {
    const { status, startDate, endDate, limit } = req.query;
    const payments = await paymentService.getRestaurantPayments(req.params.restaurantId, {
      status, startDate, endDate, limit: limit ? parseInt(limit) : 100
    });
    res.status(200).json({ payments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PRIVATE RUTA - IDOR ZAŠTIĆENA
router.get('/restaurant/:restaurantId/statistics', authenticateToken, requireRestaurantOwnership, async (req, res) => {
  try {
    const statistics = await paymentService.getPaymentStatistics(req.params.restaurantId, req.query.startDate, req.query.endDate);
    res.status(200).json({ statistics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PRIVATE RUTA - ONEMOGUĆEN PARCIJALNI REFUND
router.post('/refund/:paymentId', authenticateToken, async (req, res) => {
  try {
    await verifyPaymentOwnership(req.params.paymentId, req.user._id);
    if (req.body.amount) {
      return res.status(400).json({ error: 'Partial refunds are strictly prohibited via this API.' });
    }
    const result = await paymentService.refundPayment(req.params.paymentId);
    res.status(200).json({ success: true, refund: result.refund, payment: result.payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;