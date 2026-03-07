// server/services/receiptService.js
const { getDB } = require('../config/database');
const emailService = require('./emailService');

const generateReceiptNumber = async (db, restaurantId) => {
  const year = new Date().getFullYear();
  // ISPRAVLJENO: queryOne sprječava globalni pad Postgresa zbog Unique Constrainta
  const row = await db.queryOne(
    'SELECT get_next_sequence_value($1, $2, $3) AS next_val',[restaurantId, 'receipt', year]
  );
  
  const nextNumber = row?.next_val || 1;
  const rIdStr = restaurantId.toString().replace(/-/g, '').substring(0, 4).toUpperCase();
  return `RCP-${rIdStr}-${year}-${String(nextNumber).padStart(5, '0')}`;
};

const generateReceipt = async (paymentId, customerEmail = null) => {
  const db = getDB();

  const payment = await db.getPaymentWithBill(paymentId);
  if (!payment) throw new Error('Payment not found');
  if (payment.status !== 'succeeded') throw new Error('Cannot generate receipt for incomplete payment');

  const existing = await db.getReceiptByPaymentId(paymentId);
  if (existing) return { ...existing, _id: existing.id };

  const restaurant = await db.getRestaurantById(payment.restaurant_id);
  const items = await db.getPaymentItemsWithDetails(paymentId);

  const receiptNumber = await generateReceiptNumber(db, payment.restaurant_id);
  
  const receiptData = {
    restaurant: { name: restaurant?.name },
    items: items.map(i => ({
      name: i.bill_item.name,
      quantity: parseFloat(i.quantity),
      price: parseFloat(i.unit_price),
      total: parseFloat(i.amount),
    })),
    subtotal: parseFloat(payment.subtotal),
    tipAmount: parseFloat(payment.tip_amount),
    totalAmount: parseFloat(payment.total_amount),
    paymentMethod: payment.payment_method_type || 'card',
    transactionId: payment.stripe_payment_intent_id || payment.id,
  };

  const receipt = await db.createReceipt({
    payment_id: paymentId,
    restaurant_id: payment.restaurant_id,
    receipt_number: receiptNumber,
    receipt_data: receiptData,
    email_sent_to: customerEmail || payment.guest_email || null,
  });

  console.log('Račun kreiran:', receiptNumber);

  if (customerEmail || payment.guest_email) {
    try { await sendReceiptEmail(receipt.id); }
    catch (e) { console.error('Greška slanja emaila:', e.message); }
  }

  return { ...receipt, _id: receipt.id };
};

const sendReceiptEmail = async (receiptId) => {
  const db = getDB();
  const receipt = await db.getReceiptById(receiptId);
  if (!receipt) throw new Error('Receipt not found');
  if (!receipt.email_sent_to) throw new Error('No customer email');

  const restaurant = await db.getRestaurantById(receipt.restaurant_id);
  const receiptData = typeof receipt.receipt_data === 'string'
    ? JSON.parse(receipt.receipt_data) : receipt.receipt_data;

  const emailResult = await emailService.sendReceiptEmail({
    receiptNumber: receipt.receipt_number,
    restaurantName: restaurant?.name,
    ...receiptData,
    customerEmail: receipt.email_sent_to,
    createdAt: receipt.created_at,
  });

  await db.updateReceiptEmailStatus(receiptId, emailResult.success ? 'sent' : 'failed');
  return { success: emailResult.success, messageId: emailResult.messageId };
};

const getReceiptById = async (receiptId) => {
  const db = getDB();
  const r = await db.getReceiptWithPayment(receiptId);
  if (!r) throw new Error('Receipt not found');
  return { ...r, _id: r.id };
};

const getReceiptByNumber = async (receiptNumber) => {
  const db = getDB();
  const r = await db.getReceiptByNumber(receiptNumber);
  if (!r) throw new Error('Receipt not found');
  return { ...r, _id: r.id };
};

const getReceiptByPaymentId = async (paymentId) => {
  const db = getDB();
  const r = await db.getReceiptByPaymentId(paymentId);
  if (!r) throw new Error('Receipt not found for this payment');
  return { ...r, _id: r.id };
};

const getRestaurantReceipts = async (restaurantId, options = {}) => {
  const db = getDB();
  const { limit = 50, skip = 0, startDate, endDate, status } = options;
  const result = await db.getReceipts(
    {
      restaurant_id: restaurantId,
      email_status: status,
      date_from: startDate ? new Date(startDate) : undefined,
      date_to:   endDate   ? new Date(endDate)   : undefined,
    },
    { limit: Math.min(limit, 100), page: Math.floor(skip / limit) + 1 }
  );
  return { receipts: result.data.map(r => ({ ...r, _id: r.id })), total: result.total, limit, skip };
};

const resendReceiptEmail = async (receiptId, newEmail = null) => {
  const db = getDB();
  if (newEmail) await db.updateReceipt(receiptId, { email_sent_to: newEmail });
  return sendReceiptEmail(receiptId);
};

const updateReceiptEmail = async (receiptId, email) => {
  const db = getDB();
  const r = await db.updateReceipt(receiptId, { email_sent_to: email });
  if (!r) throw new Error('Receipt not found');
  return { ...r, _id: r.id };
};

const getReceiptStatistics = async (restaurantId, startDate, endDate) => {
  const db = getDB();

  const conditions = ['r.restaurant_id = $1'];
  const params = [restaurantId];
  let idx = 2;

  if (startDate) { conditions.push(`r.created_at >= $${idx++}`); params.push(new Date(startDate)); }
  if (endDate)   { conditions.push(`r.created_at <= $${idx++}`); params.push(new Date(endDate)); }

  const where = conditions.join(' AND ');

  const result = await db.queryOne(
    `SELECT
       COUNT(r.id)::int                                                  AS total_receipts,
       COALESCE(SUM((r.receipt_data->>'totalAmount')::numeric), 0)::float AS total_revenue,
       COALESCE(SUM((r.receipt_data->>'tipAmount')::numeric), 0)::float   AS total_tips,
       COUNT(r.id) FILTER (WHERE r.email_status = 'sent')::int            AS emails_sent,
       COUNT(r.id) FILTER (WHERE r.email_status = 'failed')::int          AS emails_failed
     FROM receipts r
     WHERE ${where}`,
    params
  );

  const totalReceipts = result.total_receipts || 0;
  const totalRevenue  = result.total_revenue  || 0;

  return {
    totalReceipts,
    totalRevenue,
    totalTips:         result.total_tips    || 0,
    emailsSent:        result.emails_sent   || 0,
    emailsFailed:      result.emails_failed || 0,
    averageOrderValue: totalReceipts > 0 ? Number((totalRevenue / totalReceipts).toFixed(2)) : 0,
  };
};
module.exports = { generateReceipt, sendReceiptEmail, getReceiptById, getReceiptByNumber, getReceiptByPaymentId, getRestaurantReceipts, resendReceiptEmail, updateReceiptEmail, getReceiptStatistics };