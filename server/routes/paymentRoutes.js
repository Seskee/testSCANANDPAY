// server/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const paymentService = require('../services/paymentService');
const { authenticateToken } = require('./middleware/auth'); // DODANO ZA ZAŠTITU

// PUBLIC RUTA - Gosti kreiraju plaćanja bez tokena
router.post('/create', async (req, res) => {
  try {
    const { billId, items, tip, paymentMethod, customerEmail } = req.body;

    if (tip !== undefined && (typeof tip !== 'number' || tip < 0 || tip > 10000)) {
      return res.status(400).json({ error: 'Tip must be a valid positive number' });
    }

    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;
    if (!idempotencyKey && (!billId || !billId.startsWith('demo-'))) {
      return res.status(400).json({ error: 'Idempotency key is required to prevent double charges' });
    }

    // DEMO MODE
    if (billId && billId.startsWith('demo-')) {
      const mockAmount = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
      const mockTotal = mockAmount + (tip || 0);
      return res.status(201).json({
        paymentId: 'demo-payment-' + Date.now(),
        clientSecret: 'demo_secret_' + randomUUID(),
        amount: mockAmount,
        totalAmount: mockTotal,
        currency: 'eur',
        demo: true
      });
    }

    if (!billId || !items || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields: billId, items, paymentMethod' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items must be a non-empty array' });
    }

    for (const item of items) {
      if (!item.itemId || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(400).json({ error: 'Invalid item structure. Must have itemId and positive quantity.' });
      }
    }

    const result = await paymentService.createPayment(billId, {
      items,
      tip: tip || 0,
      paymentMethod,
      customerEmail,
      idempotencyKey
    });

    res.status(201).json({
      paymentId: result.payment._id || result.payment.id,
      clientSecret: result.clientSecret,
      amount: result.payment.amount,
      totalAmount: result.payment.totalAmount,
      currency: result.payment.currency
    });
  } catch (error) {
    console.error('Error creating payment:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUBLIC RUTA - Gosti potvrđuju plaćanja
router.post('/confirm/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (paymentId && paymentId.startsWith('demo-payment-')) {
      return res.status(200).json({
        success: true,
        status: 'succeeded',
        payment: { id: paymentId, status: 'succeeded', demo: true }
      });
    }

    if (!paymentId) return res.status(400).json({ error: 'Payment ID is required' });

    const payment = await paymentService.confirmPayment(paymentId);

    res.status(200).json({
      success: payment.status === 'succeeded',
      status: payment.status,
      payment: {
        id: payment._id || payment.id,
        amount: payment.amount,
        tip: payment.tip,
        totalAmount: payment.totalAmount,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
      }
    });
  } catch (error) {
    console.error('Error confirming payment:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PRIVATE RUTA - Samo autorizirani restorani (authenticateToken)
router.get('/:paymentId', authenticateToken, async (req, res) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.paymentId);
    res.status(200).json({ payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PRIVATE RUTA
router.get('/intent/:intentId', authenticateToken, async (req, res) => {
  try {
    const payment = await paymentService.getPaymentByIntentId(req.params.intentId);
    res.status(200).json({ payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PRIVATE RUTA - SPRJEČAVA HAKERE DA RADE REFUND!
router.post('/refund/:paymentId', authenticateToken, async (req, res) => {
  try {
    const result = await paymentService.refundPayment(req.params.paymentId, req.body.amount);
    res.status(200).json({
      success: true,
      refund: { id: result.refund.id, amount: result.refund.amount / 100, status: result.refund.status },
      payment: { id: result.payment._id || result.payment.id, status: result.payment.status }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PRIVATE RUTA
router.get('/restaurant/:restaurantId', authenticateToken, async (req, res) => {
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

// PRIVATE RUTA
router.get('/restaurant/:restaurantId/statistics', authenticateToken, async (req, res) => {
  try {
    const statistics = await paymentService.getPaymentStatistics(req.params.restaurantId, req.query.startDate, req.query.endDate);
    res.status(200).json({ statistics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;