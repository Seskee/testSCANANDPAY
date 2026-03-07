// server/routes/receiptRoutes.js
const express = require('express');
const router = express.Router();
const receiptService = require('../services/receiptService');
const { authenticateToken } = require('./middleware/auth');
const { getDB } = require('../config/database');

// 🔒 GDPR: Validacija email adrese
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
};

// 🔒 HELPER: Provjera vlasništva restorana nad računom
const verifyReceiptOwnership = async (receiptId, userId) => {
  const db = getDB();
  const receipt = await db.getReceiptById(receiptId);
  if (!receipt) throw new Error('Receipt not found');
  const restaurant = await db.getRestaurantById(receipt.restaurant_id);
  if (!restaurant || restaurant.owner_id.toString() !== userId.toString()) {
    throw new Error('Unauthorized access to this receipt');
  }
  return receipt;
};

// 🔒 ISPRAVAK: Dodana autentikacija — samo vlasnik restorana može generirati račun
// (gost dobiva link na račun automatski nakon plaćanja putem webhooksa)
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { paymentId, customerEmail, gdprConsent } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'Payment ID is required' });

    // Provjera vlasništva: payment mora biti od restorana kojeg korisnik posjeduje
    const db = getDB();
    const payment = await db.getPaymentById(paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    const restaurant = await db.getRestaurantById(payment.restaurant_id);
    if (!restaurant || restaurant.owner_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized access to this payment' });
    }

    // 🔒 GDPR: Email samo uz privolu
    const emailToStore = (customerEmail && gdprConsent && isValidEmail(customerEmail))
      ? customerEmail.trim()
      : null;

    if (customerEmail && !gdprConsent) {
      return res.status(400).json({
        error: 'GDPR_CONSENT_REQUIRED',
        message: 'Explicit consent is required to store email address.'
      });
    }

    const receipt = await receiptService.generateReceipt(paymentId, emailToStore);
    res.status(201).json({ success: true, receipt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔒 ISPRAVAK: Dodana autentikacija + GDPR validacija
router.post('/send-email', authenticateToken, async (req, res) => {
  try {
    const { receiptId, paymentId, email, gdprConsent } = req.body;

    if (!email) return res.status(400).json({ error: 'Email address is required' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address format' });

    // 🔒 GDPR: Ne smijemo slati/pohraniti email bez privole
    if (!gdprConsent) {
      return res.status(400).json({
        error: 'GDPR_CONSENT_REQUIRED',
        message: 'Explicit consent is required to send receipt to email address.'
      });
    }

    if (process.env.ENABLE_DEMO_MODE === 'true' && paymentId && paymentId.startsWith('demo-')) {
      return res.status(200).json({
        success: true, message: 'Receipt email sent successfully (demo)',
        messageId: `demo-receipt-${Date.now()}`, simulated: true
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

    // 🔒 ISPRAVAK: Vlasnik mora biti autentificiran za promjenu email adrese na računu
    const db = getDB();
    const restaurant = await db.getRestaurantById(receipt.restaurant_id);
    if (!restaurant || restaurant.owner_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized access to this receipt' });
    }

    if (receipt.email_sent_to !== email) {
      await receiptService.updateReceiptEmail(receipt._id, email.trim());
    }

    const result = await receiptService.sendReceiptEmail(receipt._id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// JAVNA RUTA — gost pregledava vlastiti račun putem UUID linka
// UUID je kriptografski siguran identifikator (ne može se brute-force-ati)
router.get('/:receiptId', async (req, res) => {
  try {
    const receipt = await receiptService.getReceiptById(req.params.receiptId);
    res.status(200).json({ success: true, receipt });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// ZAKLJUČANA RUTA — samo vlasnik restorana može pretraživati po rednom broju
router.get('/number/:receiptNumber', authenticateToken, async (req, res) => {
  try {
    const receipt = await receiptService.getReceiptByNumber(req.params.receiptNumber);
    const db = getDB();
    const restaurant = await db.getRestaurantById(receipt.restaurant_id);
    if (!restaurant || restaurant.owner_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    res.status(200).json({ success: true, receipt });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// JAVNA RUTA — gost pregledava račun putem payment UUID-a
router.get('/payment/:paymentId', async (req, res) => {
  try {
    const receipt = await receiptService.getReceiptByPaymentId(req.params.paymentId);
    res.status(200).json({ success: true, receipt });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// 🔒 ISPRAVAK: Dodana autentikacija + GDPR validacija
router.post('/:receiptId/resend', authenticateToken, async (req, res) => {
  try {
    const { email, gdprConsent } = req.body;

    // Provjera vlasništva
    await verifyReceiptOwnership(req.params.receiptId, req.user._id);

    // 🔒 GDPR: Ako se mijenja email, treba privola
    if (email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email address format' });
      }
      if (!gdprConsent) {
        return res.status(400).json({
          error: 'GDPR_CONSENT_REQUIRED',
          message: 'Explicit consent is required to send receipt to email address.'
        });
      }
    }

    const result = await receiptService.resendReceiptEmail(req.params.receiptId, email ? email.trim() : null);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.message.includes('Unauthorized') ? 403 : 500).json({ error: error.message });
  }
});

// ZAKLJUČANA RUTA — lista računa restorana
router.get('/restaurant/:restaurantId', authenticateToken, async (req, res) => {
  try {
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

// ZAKLJUČANA RUTA — statistike restorana
router.get('/restaurant/:restaurantId/statistics', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const restaurant = await db.getRestaurantById(req.params.restaurantId);
    if (!restaurant || restaurant.owner_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized access to this restaurant' });
    }
    const statistics = await receiptService.getReceiptStatistics(
      req.params.restaurantId, req.query.startDate, req.query.endDate
    );
    res.status(200).json({ success: true, statistics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;