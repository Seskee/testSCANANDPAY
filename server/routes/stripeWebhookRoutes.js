const express = require("express");
const Stripe = require("stripe");
const { getDB } = require("../config/database");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /webhooks/stripe
router.post("/stripe", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`⚠️ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = getDB();

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      console.log(`💰 Webhook: PaymentIntent ${paymentIntent.id} succeeded!`);
      
      const payment = await db.getPaymentByStripeIntentId(paymentIntent.id);
      if (payment && payment.status !== 'succeeded') {
        // Osiguravamo da je plaćanje zabilježeno čak i ako je gostu pukao internet
        await db.markPaymentAsSucceeded(payment.id, {
          stripe_charge_id: paymentIntent.latest_charge || '',
          payment_method_type: paymentIntent.payment_method_types[0] || 'card',
        });
        console.log(`✅ Webhook: Payment ${payment.id} marked as succeeded in DB.`);
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const failedIntent = event.data.object;
      const failedPayment = await db.getPaymentByStripeIntentId(failedIntent.id);
      if (failedPayment) {
        await db.markPaymentAsFailed(
          failedPayment.id, 
          failedIntent.last_payment_error?.code || 'unknown_error',
          failedIntent.last_payment_error?.message || 'Payment failed'
        );
      }
    }
  } catch (dbError) {
    console.error(`❌ Webhook DB Error: ${dbError.message}`);
  }

  res.status(200).json({ received: true });
});

module.exports = router;