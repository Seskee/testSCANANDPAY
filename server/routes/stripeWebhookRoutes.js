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
      
      let payment = await db.getPaymentByStripeIntentId(paymentIntent.id);
      
      // BANK-GRADE SELF-HEALING: Ghost Webhook Recovery
      // Ako je Node.js krepao između kreiranja Stripe Intenta i upisa u našu bazu, 
      // webhook bi pao. Ovako pronalazimo izgubljenu transakciju preko Stripe Metadate!
      if (!payment && paymentIntent.metadata && paymentIntent.metadata.internalPaymentId) {
          console.warn(`⚠️ Webhook Recovery: PaymentIntent ${paymentIntent.id} not found by Intent ID. Falling back to internal Metadata ID...`);
          payment = await db.getPaymentById(paymentIntent.metadata.internalPaymentId);
          
          if (payment) {
              // Iscjeljujemo bazu - povezujemo odbjegli intent s našim računom
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
        } else {
           console.log(`ℹ️ Webhook: Payment ${payment.id} was already processed by another worker.`);
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const failedIntent = event.data.object;
      let failedPayment = await db.getPaymentByStripeIntentId(failedIntent.id);
      
      // Ghost webhook recovery za failed status
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
    console.error(`❌ Webhook DB Error: ${dbError.message}`);
  }

  res.status(200).json({ received: true });
});

module.exports = router;