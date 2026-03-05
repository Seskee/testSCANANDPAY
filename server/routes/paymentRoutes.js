// server/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const paymentService = require('../services/paymentService');

// Description: Create a payment intent for a bill
// Endpoint: POST /api/payments/create
// Request: { billId: string, items: Array<{ itemId: string, quantity: number }>, tip: number, paymentMethod: string, customerEmail?: string }
// Response: { paymentId: string, clientSecret: string, amount: number, totalAmount: number }
router.post('/create', async (req, res) => {
  try {
    const { billId, items, tip, paymentMethod, customerEmail } = req.body;

    // ISPRAVLJENO 1: Validacija napojnice (tip) kako bi se spriječio negativan iznos
    if (tip !== undefined && (typeof tip !== 'number' || tip < 0)) {
      return res.status(400).json({ error: 'Tip must be a positive number or zero' });
    }

    // ISPRAVLJENO 2: Uzimamo ključ isključivo s frontenda
    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;

    // ISPRAVLJENO 3: Ako nije demo mod, a frontend nije poslao ključ, blokiraj uplatu!
    if (!idempotencyKey && (!billId || !billId.startsWith('demo-'))) {
      return res.status(400).json({ error: 'Idempotency key is required to prevent double charges' });
    }

    console.log(`Creating payment for bill: ${billId}`);

    // DEMO MODE: Return mock payment response for demo bills
    if (billId && billId.startsWith('demo-')) {
      console.log('Demo mode payment - returning mock success response');
      const mockAmount = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
      const mockTotal = mockAmount + (tip || 0);
      
      return res.status(201).json({
        paymentId: 'demo-payment-' + Date.now(),
        clientSecret: 'demo_secret_' + randomUUID(),
        amount: mockAmount,
        totalAmount: mockTotal,
        currency: 'usd',
        demo: true,
        message: 'Demo payment - no real transaction processed'
      });
    }

    if (!billId || !items || !paymentMethod) {
      return res.status(400).json({
        error: 'Missing required fields: billId, items, paymentMethod'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Items must be a non-empty array'
      });
    }

    // Validate items structure
    for (const item of items) {
      if (!item.itemId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          error: 'Each item must have itemId and quantity > 0'
        });
      }
    }

    const result = await paymentService.createPayment(billId, {
      items,
      tip: tip || 0,
      paymentMethod,
      customerEmail,
      idempotencyKey // Ovaj ključ sada sigurno dolazi s frontenda
    });

    console.log(`Payment created successfully: ${result.payment._id || result.payment.id}`);

    res.status(201).json({
      paymentId: result.payment._id || result.payment.id,
      clientSecret: result.clientSecret,
      amount: result.payment.amount,
      totalAmount: result.payment.totalAmount,
      currency: result.payment.currency
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Description: Confirm a payment after Stripe processing
// Endpoint: POST /api/payments/confirm/:paymentId
// Request: {}
// Response: { success: boolean, status: string, payment: object }
router.post('/confirm/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    console.log(`Confirming payment: ${paymentId}`);

    // DEMO MODE: Return mock confirmation for demo payments
    if (paymentId && paymentId.startsWith('demo-payment-')) {
      console.log('Demo mode payment confirmation - returning mock success');
      return res.status(200).json({
        success: true,
        status: 'succeeded',
        payment: {
          id: paymentId,
          amount: 95.96,
          tip: 0,
          totalAmount: 95.96,
          status: 'succeeded',
          paymentMethod: 'demo',
          createdAt: new Date(),
          demo: true
        },
        message: 'Demo payment confirmed - no real transaction processed'
      });
    }

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const payment = await paymentService.confirmPayment(paymentId);

    console.log(`Payment confirmed: ${paymentId}, status: ${payment.status}`);

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
        createdAt: payment.createdAt
      }
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Description: Get payment details by ID
// Endpoint: GET /api/payments/:paymentId
// Request: {}
// Response: { payment: object }
router.get('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    console.log(`Fetching payment: ${paymentId}`);

    const payment = await paymentService.getPaymentById(paymentId);

    res.status(200).json({
      payment: {
        id: payment._id || payment.id,
        billId: payment.bill._id || payment.bill.id,
        restaurantId: payment.restaurant._id || payment.restaurant.id,
        restaurantName: payment.restaurant.name,
        amount: payment.amount,
        tip: payment.tip,
        totalAmount: payment.totalAmount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        items: payment.items,
        createdAt: payment.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Description: Get payment by Stripe payment intent ID
// Endpoint: GET /api/payments/intent/:intentId
// Request: {}
// Response: { payment: object }
router.get('/intent/:intentId', async (req, res) => {
  try {
    const { intentId } = req.params;

    console.log(`Fetching payment by intent ID: ${intentId}`);

    const payment = await paymentService.getPaymentByIntentId(intentId);

    res.status(200).json({
      payment: {
        id: payment._id || payment.id,
        billId: payment.bill._id || payment.bill.id,
        restaurantId: payment.restaurant._id || payment.restaurant.id,
        amount: payment.amount,
        tip: payment.tip,
        totalAmount: payment.totalAmount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        createdAt: payment.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching payment by intent ID:', error);
    res.status(500).json({ error: error.message });
  }
});

// Description: Refund a payment
// Endpoint: POST /api/payments/refund/:paymentId
// Request: { amount?: number }
// Response: { success: boolean, refund: object }
router.post('/refund/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount } = req.body;

    console.log(`Refunding payment: ${paymentId}`);

    const result = await paymentService.refundPayment(paymentId, amount);

    console.log(`Payment refunded successfully: ${paymentId}`);

    res.status(200).json({
      success: true,
      refund: {
        id: result.refund.id,
        amount: result.refund.amount / 100,
        status: result.refund.status
      },
      payment: {
        id: result.payment._id || result.payment.id,
        status: result.payment.status
      }
    });
  } catch (error) {
    console.error('Error refunding payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Description: Get payment statistics for a restaurant
// Endpoint: GET /api/payments/restaurant/:restaurantId/statistics
// Request: { startDate?: string, endDate?: string }
// Response: { statistics: object }
router.get('/restaurant/:restaurantId/statistics', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { startDate, endDate } = req.query;

    console.log(`Fetching payment statistics for restaurant: ${restaurantId}`);

    const statistics = await paymentService.getPaymentStatistics(
      restaurantId,
      startDate,
      endDate
    );

    console.log(`Payment statistics retrieved for restaurant: ${restaurantId}`);

    res.status(200).json({ statistics });
  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Description: Get all payments for a restaurant
// Endpoint: GET /api/payments/restaurant/:restaurantId
// Request: { status?: string, startDate?: string, endDate?: string, limit?: number }
// Response: { payments: array }
router.get('/restaurant/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status, startDate, endDate, limit } = req.query;

    console.log(`Fetching payments for restaurant: ${restaurantId}`);

    const payments = await paymentService.getRestaurantPayments(restaurantId, {
      status,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 100
    });

    console.log(`Found ${payments.length} payments for restaurant: ${restaurantId}`);

    res.status(200).json({
      payments: payments.map(payment => ({
        id: payment._id || payment.id,
        billId: payment.bill?._id || payment.bill?.id,
        amount: payment.amount,
        tip: payment.tip,
        totalAmount: payment.totalAmount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        customerEmail: payment.customerEmail,
        createdAt: payment.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching restaurant payments:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;