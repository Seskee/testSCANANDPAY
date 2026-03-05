const express = require('express');
const router = express.Router();
const receiptService = require('../services/receiptService');
const { authenticateToken } = require('./middleware/auth');

// Description: Generate a receipt for a completed payment
// Endpoint: POST /api/receipts/generate
// Request: { paymentId: string, customerEmail?: string }
// Response: { receipt: Receipt }
router.post('/generate', async (req, res) => {
  try {
    const { paymentId, customerEmail } = req.body;

    console.log(`Generating receipt for payment: ${paymentId}`);

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const receipt = await receiptService.generateReceipt(paymentId, customerEmail);

    res.status(201).json({
      success: true,
      receipt: {
        _id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        totalAmount: receipt.totalAmount,
        subtotal: receipt.subtotal,
        tipAmount: receipt.tipAmount,
        items: receipt.items,
        paymentMethod: receipt.paymentMethod,
        transactionId: receipt.transactionId,
        tableNumber: receipt.tableNumber,
        emailSent: receipt.emailSent,
        createdAt: receipt.createdAt
      }
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ error: error.message });
  }
});

// Description: Send receipt via email
// Endpoint: POST /api/receipts/send-email
// Request: { receiptId?: string, paymentId?: string, email: string }
// Response: { success: boolean, messageId: string }
router.post('/send-email', async (req, res) => {
  try {
    const { receiptId, paymentId, email } = req.body;

    console.log(`Sending receipt email - receiptId: ${receiptId}, paymentId: ${paymentId}, email: ${email}`);

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    // Handle demo mode
    if (paymentId && (paymentId.startsWith('demo-payment-') || paymentId === 'demo')) {
      console.log('Demo mode detected - simulating receipt email send');
      return res.status(200).json({
        success: true,
        message: 'Receipt email sent successfully (demo mode)',
        messageId: `demo-receipt-${Date.now()}`,
        simulated: true
      });
    }

    let receipt;

    // Find receipt by ID or payment ID
    if (receiptId) {
      receipt = await receiptService.getReceiptById(receiptId);
    } else if (paymentId) {
      receipt = await receiptService.getReceiptByPaymentId(paymentId);
    } else {
      return res.status(400).json({ error: 'Receipt ID or Payment ID is required' });
    }

    // Update email if different
    if (receipt.customerEmail !== email) {
      await receiptService.updateReceiptEmail(receipt._id, email);
    }

    // Send email
    const result = await receiptService.sendReceiptEmail(receipt._id);

    res.status(200).json({
      success: true,
      message: 'Receipt email sent successfully',
      messageId: result.messageId,
      simulated: result.simulated || false
    });
  } catch (error) {
    console.error('Error sending receipt email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Description: Get receipt by ID
// Endpoint: GET /api/receipts/:receiptId
// Request: {}
// Response: { receipt: Receipt }
router.get('/:receiptId', async (req, res) => {
  try {
    const { receiptId } = req.params;

    console.log(`Fetching receipt: ${receiptId}`);

    const receipt = await receiptService.getReceiptById(receiptId);

    res.status(200).json({
      success: true,
      receipt: {
        _id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        payment: receipt.payment,
        bill: receipt.bill,
        restaurant: receipt.restaurant,
        customerEmail: receipt.customerEmail,
        items: receipt.items,
        subtotal: receipt.subtotal,
        tipAmount: receipt.tipAmount,
        tipPercentage: receipt.tipPercentage,
        totalAmount: receipt.totalAmount,
        paymentMethod: receipt.paymentMethod,
        paymentStatus: receipt.paymentStatus,
        transactionId: receipt.transactionId,
        tableNumber: receipt.tableNumber,
        emailSent: receipt.emailSent,
        emailSentAt: receipt.emailSentAt,
        emailDeliveryStatus: receipt.emailDeliveryStatus,
        createdAt: receipt.createdAt,
        updatedAt: receipt.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(404).json({ error: error.message });
  }
});

// Description: Get receipt by receipt number
// Endpoint: GET /api/receipts/number/:receiptNumber
// Request: {}
// Response: { receipt: Receipt }
router.get('/number/:receiptNumber', async (req, res) => {
  try {
    const { receiptNumber } = req.params;

    console.log(`Fetching receipt by number: ${receiptNumber}`);

    const receipt = await receiptService.getReceiptByNumber(receiptNumber);

    res.status(200).json({
      success: true,
      receipt: {
        _id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        payment: receipt.payment,
        bill: receipt.bill,
        restaurant: receipt.restaurant,
        customerEmail: receipt.customerEmail,
        items: receipt.items,
        subtotal: receipt.subtotal,
        tipAmount: receipt.tipAmount,
        tipPercentage: receipt.tipPercentage,
        totalAmount: receipt.totalAmount,
        paymentMethod: receipt.paymentMethod,
        paymentStatus: receipt.paymentStatus,
        transactionId: receipt.transactionId,
        tableNumber: receipt.tableNumber,
        emailSent: receipt.emailSent,
        emailSentAt: receipt.emailSentAt,
        emailDeliveryStatus: receipt.emailDeliveryStatus,
        createdAt: receipt.createdAt,
        updatedAt: receipt.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching receipt by number:', error);
    res.status(404).json({ error: error.message });
  }
});

// Description: Get receipt by payment ID
// Endpoint: GET /api/receipts/payment/:paymentId
// Request: {}
// Response: { receipt: Receipt }
router.get('/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    console.log(`Fetching receipt for payment: ${paymentId}`);

    const receipt = await receiptService.getReceiptByPaymentId(paymentId);

    res.status(200).json({
      success: true,
      receipt: {
        _id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        payment: receipt.payment,
        bill: receipt.bill,
        restaurant: receipt.restaurant,
        customerEmail: receipt.customerEmail,
        items: receipt.items,
        subtotal: receipt.subtotal,
        tipAmount: receipt.tipAmount,
        tipPercentage: receipt.tipPercentage,
        totalAmount: receipt.totalAmount,
        paymentMethod: receipt.paymentMethod,
        paymentStatus: receipt.paymentStatus,
        transactionId: receipt.transactionId,
        tableNumber: receipt.tableNumber,
        emailSent: receipt.emailSent,
        emailSentAt: receipt.emailSentAt,
        emailDeliveryStatus: receipt.emailDeliveryStatus,
        createdAt: receipt.createdAt,
        updatedAt: receipt.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching receipt for payment:', error);
    res.status(404).json({ error: error.message });
  }
});

// Description: Resend receipt email
// Endpoint: POST /api/receipts/:receiptId/resend
// Request: { email?: string }
// Response: { success: boolean, messageId: string }
router.post('/:receiptId/resend', async (req, res) => {
  try {
    const { receiptId } = req.params;
    const { email } = req.body;

    console.log(`Resending receipt email for receipt: ${receiptId}`);

    const result = await receiptService.resendReceiptEmail(receiptId, email);

    res.status(200).json({
      success: true,
      message: 'Receipt email resent successfully',
      messageId: result.messageId,
      simulated: result.simulated || false
    });
  } catch (error) {
    console.error('Error resending receipt email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Description: Get all receipts for a restaurant (authenticated)
// Endpoint: GET /api/receipts/restaurant/:restaurantId
// Request: { limit?: number, skip?: number, startDate?: string, endDate?: string, status?: string }
// Response: { receipts: Array<Receipt>, total: number, limit: number, skip: number }
router.get('/restaurant/:restaurantId', authenticateToken, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { limit, skip, startDate, endDate, status } = req.query;

    console.log(`Fetching receipts for restaurant: ${restaurantId}`);

    const options = {
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
      startDate,
      endDate,
      status
    };

    const result = await receiptService.getRestaurantReceipts(restaurantId, options);

    res.status(200).json({
      success: true,
      receipts: result.receipts,
      total: result.total,
      limit: result.limit,
      skip: result.skip
    });
  } catch (error) {
    console.error('Error fetching restaurant receipts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Description: Get receipt statistics for a restaurant (authenticated)
// Endpoint: GET /api/receipts/restaurant/:restaurantId/statistics
// Request: { startDate?: string, endDate?: string }
// Response: { statistics: ReceiptStatistics }
router.get('/restaurant/:restaurantId/statistics', authenticateToken, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { startDate, endDate } = req.query;

    console.log(`Fetching receipt statistics for restaurant: ${restaurantId}`);

    const statistics = await receiptService.getReceiptStatistics(restaurantId, startDate, endDate);

    res.status(200).json({
      success: true,
      statistics
    });
  } catch (error) {
    console.error('Error fetching receipt statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
