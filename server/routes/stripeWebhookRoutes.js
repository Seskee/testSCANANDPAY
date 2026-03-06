// server/routes/stripeWebhookRoutes.js
const express = require("express");
const Stripe = require("stripe");
const { getDB } = require("../config/database");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
      
      // DODANO: Sigurnosna provjera. Samo ako nije već obrađeno.
      if (payment && payment.status !== 'succeeded') {
        const updatedPayment = await db.markPaymentAsSucceeded(payment.id, {
          stripe_charge_id: paymentIntent.latest_charge || '',
          payment_method_type: paymentIntent.payment_method_types[0] || 'card',
        });
        
        // Zbog FOR UPDATE u bazi, ako markPaymentAsSucceeded vrati null, znači da je neki drugi proces to već riješio.
        if (updatedPayment) {
           console.log(`✅ Webhook: Payment ${payment.id} marked as succeeded in DB.`);
        } else {
           console.log(`ℹ️ Webhook: Payment ${payment.id} was already processed by another worker.`);
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const failedIntent = event.data.object;
      const failedPayment = await db.getPaymentByStripeIntentId(failedIntent.id);
      if (failedPayment && failedPayment.status !== 'failed') {
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