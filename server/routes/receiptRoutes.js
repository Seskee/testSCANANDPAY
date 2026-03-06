// server/routes/receiptRoutes.js
const express = require('express');
const router = express.Router();
const receiptService = require('../services/receiptService');
const { authenticateToken } = require('./middleware/auth');
const { getDB } = require('../config/database');

router.post('/generate', async (req, res) => {
  try {
    const { paymentId, customerEmail } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'Payment ID is required' });

    const receipt = await receiptService.generateReceipt(paymentId, customerEmail);
    res.status(201).json({ success: true, receipt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/send-email', async (req, res) => {
  try {
    const { receiptId, paymentId, email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required' });

    if (process.env.ENABLE_DEMO_MODE === 'true' && paymentId && paymentId.startsWith('demo-')) {
      return res.status(200).json({
        success: true, message: 'Receipt email sent successfully (demo)', messageId: `demo-receipt-${Date.now()}`, simulated: true
      });
    }

    let receipt;
    if (receiptId) {
      receipt = await receiptService.getReceiptById(receiptId);
    } else if (paymentId) {
      receipt = await receiptService.getReceiptByPaymentId(paymentId);
    } else {
      return res.status(400).json({ error: 'Receipt ID or Payment ID is required' });
    }

    if (receipt.customerEmail !== email) {
      await receiptService.updateReceiptEmail(receipt._id, email);
    }

    const result = await receiptService.sendReceiptEmail(receipt._id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// JAVNA RUTA (Dozvoljena za goste jer je ID UUID i ne može se pogoditi)
router.get('/:receiptId', async (req, res) => {
  try {
    const receipt = await receiptService.getReceiptById(req.params.receiptId);
    res.status(200).json({ success: true, receipt });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// ZAKLJUČANA RUTA (Zatvoren GDPR Data Leak - samo admini mogu pretraživati po rednom broju)
router.get('/number/:receiptNumber', authenticateToken, async (req, res) => {
  try {
    const receipt = await receiptService.getReceiptByNumber(req.params.receiptNumber);
    // Sigurnosna provjera da konobar ne traži račun iz tuđeg restorana
    const db = getDB();
    const restaurant = await db.getRestaurantById(receipt.restaurant_id);
    if (restaurant.owner_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    res.status(200).json({ success: true, receipt });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// JAVNA RUTA (Dozvoljena jer je paymentId UUID i siguran je od probijanja)
router.get('/payment/:paymentId', async (req, res) => {
  try {
    const receipt = await receiptService.getReceiptByPaymentId(req.params.paymentId);
    res.status(200).json({ success: true, receipt });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/:receiptId/resend', async (req, res) => {
  try {
    const result = await receiptService.resendReceiptEmail(req.params.receiptId, req.body.email);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/restaurant/:restaurantId', authenticateToken, async (req, res) => {
  try {
    // Sigurnosna provjera vlasništva prije dohvaćanja liste
    const db = getDB();
    const restaurant = await db.getRestaurantById(req.params.restaurantId);
    if (!restaurant || restaurant.owner_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized access to this restaurant' });
    }

    const { limit, skip, startDate, endDate, status } = req.query;
    const result = await receiptService.getRestaurantReceipts(req.params.restaurantId, {
      limit: parseInt(limit) || 50, skip: parseInt(skip) || 0, startDate, endDate, status
    });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/restaurant/:restaurantId/statistics', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const restaurant = await db.getRestaurantById(req.params.restaurantId);
    if (!restaurant || restaurant.owner_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized access to this restaurant' });
    }

    const statistics = await receiptService.getReceiptStatistics(req.params.restaurantId, req.query.startDate, req.query.endDate);
    res.status(200).json({ success: true, statistics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;