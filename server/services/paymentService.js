// server/services/paymentService.js
const { getDB } = require('../config/database');
const stripeService = require('./stripeService');

const createPayment = async (billId, data) => {
  const { items, tip = 0, customerEmail, idempotencyKey, paymentMethod = 'card' } = data;
  
  if (!idempotencyKey) throw new Error('Missing idempotency key');
  const db = getDB();

  // 1. Provjera postoji li već payment s ovim idempotencyKey-em u bazi (sprječava duplo klikanje)
  // Napomena: Za ovo bi bilo idealno dodati idempotency_key kolonu u payments tablicu, 
  // ali za sada ćemo koristiti metadata
  
  const validation = await db.validateSplitPayment(billId, items.map(i => ({ bill_item_id: i.itemId, quantity: i.quantity || 1 })));
  if (!validation.valid) throw new Error(validation.errors.join(', '));

  const bill = await db.getBillById(billId);
  if (!bill) throw new Error('Bill not found');
  if (bill.status === 'paid' || bill.status === 'void') throw new Error(`Bill is already ${bill.status}`);

  const restaurant = await db.getRestaurantById(bill.restaurant_id);

  // Dodajemo idempotencyKey u metadata kako bismo ga sačuvali
  const splitResult = await db.createSplitPayment({
    bill_id: billId,
    items: items.map(i => ({ bill_item_id: i.itemId, quantity: i.quantity || 1 })),
    tip_amount: parseFloat(tip) || 0,
    guest_email: customerEmail || null,
    metadata: { idempotencyKey } // Spremamo ključ u bazu
  });

  const payment = splitResult.payment;
  const stripeAmount = Math.round(parseFloat(payment.total_amount) * 100);

  try {
    const intent = await stripeService.createPaymentIntent(
      stripeAmount,
      restaurant.default_currency || 'eur',
      paymentMethod,
      restaurant.stripe_account_id || null,
      { billId, idempotencyKey }
    );

    await db.updatePayment(payment.id, { stripe_payment_intent_id: intent.id });

    return {
      payment: { ...payment, _id: payment.id, stripePaymentIntentId: intent.id },
      clientSecret: intent.client_secret,
    };
  } catch (stripeError) {
    // Ako Stripe baci grešku, moramo otkazati payment u bazi da ne ostane "visiti"
    await db.updatePayment(payment.id, { status: 'failed', failure_message: stripeError.message });
    throw stripeError;
  }
};

const confirmPayment = async (paymentId) => {
  const db = getDB();
  const payment = await db.getPaymentById(paymentId);
  if (!payment) throw new Error('Payment not found');

  // Ako je već uspjelo (npr. webhook je već odradio posao), samo vrati
  if (payment.status === 'succeeded') {
    return { ...payment, _id: payment.id };
  }

  const intent = await stripeService.retrievePaymentIntent(payment.stripe_payment_intent_id);
  if (intent.status !== 'succeeded') throw new Error('Payment not completed on Stripe');

  const updated = await db.markPaymentAsSucceeded(paymentId, {
    stripe_charge_id: intent.latest_charge || '',
    payment_method_type: intent.payment_method_types?.[0] || null, // FIX: intent.payment_method_type ne postoji u Stripeu, mora biti array
  });

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

const refundPayment = async (paymentId, amount) => {
  const db = getDB();
  const payment = await db.getPaymentById(paymentId);
  if (!payment) throw new Error('Payment not found');

  const refund = await stripeService.createRefund(payment.stripe_payment_intent_id, amount);
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