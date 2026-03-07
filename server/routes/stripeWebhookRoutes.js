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
    console.error(`⚠️ Webhook Signature Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🔒 Odmah vraćamo 200 OK Stripe-u da spriječimo retry loop i spam!
  // Obradu radimo asinkrono u pozadini.
  res.status(200).json({ received: true });

  // Asinkrono procesiranje eventa (ne blokira Stripe-ov HTTP odgovor)
  setImmediate(async () => {
    const db = getDB();
    try {
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        console.log(`💰 Webhook: PaymentIntent ${paymentIntent.id} succeeded!`);
        
        let payment = await db.getPaymentByStripeIntentId(paymentIntent.id);
        
        // BANK-GRADE SELF-HEALING: Traženje izgubljenog paymenta
        if (!payment && paymentIntent.metadata && paymentIntent.metadata.internalPaymentId) {
            console.warn(`⚠️ Webhook Recovery: PaymentIntent not found. Falling back to internal Metadata ID...`);
            payment = await db.getPaymentById(paymentIntent.metadata.internalPaymentId);
            
            if (payment) {
                await db.updatePayment(payment.id, { stripe_payment_intent_id: paymentIntent.id });
                console.log(`✅ Webhook Recovery: Database healed for Payment ${payment.id}`);
            }
        }

        if (payment && payment.status !== 'succeeded') {
          const updatedPayment = await db.markPaymentAsSucceeded(payment.id, {
            stripe_charge_id: paymentIntent.latest_charge || '',
            payment_method_type: paymentIntent.payment_method_types[0] || 'card',
          });
          
          if (updatedPayment) {
             console.log(`✅ Webhook: Payment ${payment.id} marked as succeeded in DB.`);
          }
        }
      } else if (event.type === 'payment_intent.payment_failed') {
        const failedIntent = event.data.object;
        let failedPayment = await db.getPaymentByStripeIntentId(failedIntent.id);
        
        if (!failedPayment && failedIntent.metadata && failedIntent.metadata.internalPaymentId) {
            failedPayment = await db.getPaymentById(failedIntent.metadata.internalPaymentId);
        }

        if (failedPayment && failedPayment.status !== 'failed') {
          await db.markPaymentAsFailed(
            failedPayment.id, 
            failedIntent.last_payment_error?.code || 'unknown_error',
            failedIntent.last_payment_error?.message || 'Payment failed'
          );
        }
      }
    } catch (dbError) {
      console.error(`❌ Webhook Background DB Error: ${dbError.message}`);
    }
  });
});

module.exports = router;