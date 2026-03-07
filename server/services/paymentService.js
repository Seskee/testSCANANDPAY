// server/services/paymentService.js
const { getDB } = require('../config/database');
const stripeService = require('./stripeService');

const createPayment = async (billId, data) => {
  const { items, tip = 0, customerEmail, idempotencyKey, paymentMethod = 'card' } = data;
  if (!idempotencyKey) throw new Error('Missing idempotency key');
  
  const db = getDB();
  const itemMap = {};
  for (const i of items) {
    const qty = Number(i.quantity);
    if (isNaN(qty) || qty <= 0) throw new Error("Invalid quantity");
    if (!itemMap[i.itemId]) itemMap[i.itemId] = 0;
    itemMap[i.itemId] += qty;
  }
  const aggregatedItems = Object.keys(itemMap).map(id => ({ itemId: id, quantity: itemMap[id] }));

  const validation = await db.validateSplitPayment(billId, aggregatedItems.map(i => ({ bill_item_id: i.itemId, quantity: i.quantity })));
  if (!validation.valid) throw new Error(validation.errors.join(', '));

  const bill = await db.getBillById(billId);
  if (!bill) throw new Error('Bill not found');
  if (bill.status === 'paid' || bill.status === 'void') throw new Error(`Bill is already ${bill.status}`);

  const restaurant = await db.getRestaurantById(bill.restaurant_id);

  const splitResult = await db.createSplitPayment({
    bill_id: billId,
    items: aggregatedItems.map(i => ({ bill_item_id: i.itemId, quantity: i.quantity })),
    tip_amount: parseFloat(tip) || 0,
    guest_email: customerEmail || null,
    metadata: { idempotencyKey }
  });

  const payment = splitResult.payment;
  const stripeAmount = Math.round(parseFloat(payment.total_amount) * 100);

  if (stripeAmount < 50) {
      await db.updatePayment(payment.id, { status: 'failed', failure_message: 'Total amount must be at least €0.50' });
      throw new Error('Total amount must be at least €0.50 to process via card.');
  }
  if (stripeAmount > 100000000) {
    await db.updatePayment(payment.id, { status: 'failed', failure_message: 'Amount exceeds maximum allowed limit' });
    throw new Error('Transaction amount exceeds safety limit.');
  }

  try {
    const intent = await stripeService.createPaymentIntent(
      stripeAmount,
      restaurant.default_currency || 'eur',
      paymentMethod,
      restaurant.stripe_account_id || null,
      { 
        billId, 
        idempotencyKey,
        // BANK-GRADE: Injiciramo naš interni ID kako bi Webhook sam pronašao put doma ako DB zapis pukne
        internalPaymentId: payment.id 
      }
    );

    await db.updatePayment(payment.id, { stripe_payment_intent_id: intent.id });

    return {
      payment: { ...payment, _id: payment.id, stripePaymentIntentId: intent.id },
      clientSecret: intent.client_secret,
    };
  } catch (stripeError) {
    await db.updatePayment(payment.id, { status: 'failed', failure_message: stripeError.message });
    throw stripeError;
  }
};

const confirmPayment = async (paymentId) => {
  const db = getDB();
  const payment = await db.getPaymentById(paymentId);
  if (!payment) throw new Error('Payment not found');

  if (payment.status === 'succeeded') return { ...payment, _id: payment.id };

  // 🔒 ISPRAVAK: Dohvaćamo Stripe account ID restorana
  const restaurant = await db.getRestaurantById(payment.restaurant_id);
  const intent = await stripeService.retrievePaymentIntent(
    payment.stripe_payment_intent_id, 
    restaurant.stripe_account_id
  );
  
  if (intent.status !== 'succeeded') throw new Error('Payment not completed on Stripe');

  const updated = await db.markPaymentAsSucceeded(paymentId, {
    stripe_charge_id: intent.latest_charge || '',
    payment_method_type: intent.payment_method_types?.[0] || null,
  });

  if (!updated) {
      const safePayment = await db.getPaymentById(paymentId);
      return { ...safePayment, _id: safePayment.id, status: 'succeeded' };
  }

  return { ...updated, _id: updated.id, status: 'succeeded' };
};

const getPaymentById = async (paymentId) => {
  const db = getDB();
  const payment = await db.getPaymentWithBill(paymentId);
  if (!payment) throw new Error('Payment not found');
  return {
    ...payment, _id: payment.id,
    amount: parseFloat(payment.subtotal),
    tip: parseFloat(payment.tip_amount),
    totalAmount: parseFloat(payment.total_amount),
  };
};

const getPaymentByIntentId = async (intentId) => {
  const db = getDB();
  const payment = await db.getPaymentByStripeIntentId(intentId);
  if (!payment) throw new Error('Payment not found');
  return { ...payment, _id: payment.id };
};

const refundPayment = async (paymentId) => {
  const db = getDB();
  const payment = await db.getPaymentById(paymentId);
  if (!payment) throw new Error('Payment not found');

  // 🔒 ISPRAVAK: Šaljemo Stripe Account ID pri refundu
  const restaurant = await db.getRestaurantById(payment.restaurant_id);
  const refund = await stripeService.createRefund(
    payment.stripe_payment_intent_id, 
    null, 
    restaurant.stripe_account_id
  );
  
  const updated = await db.refundPayment(paymentId);
  return { refund, payment: { ...updated, _id: updated.id } };
};

const getRestaurantPayments = async (restaurantId, filters = {}) => {
  const db = getDB();
  const result = await db.getPayments(
    {
      restaurant_id: restaurantId,
      status: filters.status,
      date_from: filters.startDate ? new Date(filters.startDate) : undefined,
      date_to: filters.endDate ? new Date(filters.endDate) : undefined,
    },
    { limit: filters.limit || 100, page: 1 }
  );
  return result.data.map(p => ({
    ...p, _id: p.id,
    amount: parseFloat(p.subtotal),
    tip: parseFloat(p.tip_amount),
    totalAmount: parseFloat(p.total_amount),
  }));
};

const getPaymentStatistics = async (restaurantId, startDate, endDate) => {
  const db = getDB();
  return db.getDashboardSummary(
    restaurantId,
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  );
};

module.exports = { createPayment, confirmPayment, getPaymentById, getPaymentByIntentId, refundPayment, getRestaurantPayments, getPaymentStatistics };