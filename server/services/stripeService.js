// server/services/stripeService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getDB } = require('../config/database');

const createConnectAccount = async (restaurantId, email, businessName) => {
  const account = await stripe.accounts.create({
    type: 'express', email,
    business_type: 'company',
    company: { name: businessName },
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    metadata: { restaurantId: restaurantId.toString() },
  });
  console.log(`Stripe Connect račun kreiran: ${account.id}`);
  return account;
};

const createAccountLink = async (stripeAccountId, restaurantId, refreshUrl, returnUrl) => {
  return stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
};

const getAccountDetails = async (stripeAccountId) => {
  if (stripeAccountId.startsWith('acct_test_')) {
    return { id: stripeAccountId, chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true, requirements: { currently_due: [] } };
  }
  const account = await stripe.accounts.retrieve(stripeAccountId);
  return {
    id: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirements: account.requirements,
  };
};

const updateRestaurantStripeInfo = async (restaurantId, accountDetails) => {
  const db = getDB();
  return db.updateStripeAccountStatus(restaurantId, {
    stripe_charges_enabled: accountDetails.chargesEnabled,
    stripe_payouts_enabled: accountDetails.payoutsEnabled,
    stripe_onboarding_completed: accountDetails.chargesEnabled && accountDetails.detailsSubmitted,
    stripe_account_status: accountDetails.chargesEnabled ? 'active' : 'pending',
  });
};

const createPaymentIntent = async (amount, currency, paymentMethod, stripeAccountId, metadata = {}) => {
  // FIX: Stripe očekuje payment_method_types kao array
  const paymentMethodTypes = paymentMethod === 'card' ? ['card'] : [paymentMethod, 'card'];

  const intentParams = {
    amount: Math.round(amount), // Već je pomnoženo sa 100 u paymentService
    currency: currency || 'eur',
    payment_method_types: paymentMethodTypes,
    metadata: { ...metadata },
  };

  // FIX: Ako koristimo Stripe Connect, moramo dodati application_fee_amount
  // Ovdje uzimamo 1% provizije za aplikaciju (Scan&Pay)
  if (stripeAccountId && !stripeAccountId.startsWith('acct_test_')) {
    intentParams.application_fee_amount = Math.round(amount * 0.01); // 1% fee
    intentParams.transfer_data = {
      destination: stripeAccountId,
    };
  }

  const intent = await stripe.paymentIntents.create(intentParams, {
    idempotencyKey: metadata?.idempotencyKey ? `${metadata.idempotencyKey}` : undefined,
  });
  
  console.log(`Payment intent kreiran: ${intent.id}`);
  return intent;
};

const confirmPaymentIntent = async (paymentIntentId, paymentMethodId) => {
  return stripe.paymentIntents.confirm(paymentIntentId, { payment_method: paymentMethodId });
};

const retrievePaymentIntent = async (paymentIntentId) => {
  return stripe.paymentIntents.retrieve(paymentIntentId);
};

const createRefund = async (paymentIntentId, amount) => {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined,
  });
};

const getAccountBalance = async (stripeAccountId) => {
  if (stripeAccountId.startsWith('acct_test_')) {
    return { available: [{ amount: 100000, currency: 'eur' }], pending: [{ amount: 50000, currency: 'eur' }] };
  }
  return stripe.balance.retrieve({ stripeAccount: stripeAccountId });
};

const createLoginLink = async (stripeAccountId) => {
  if (stripeAccountId.startsWith('acct_test_')) {
    return { url: 'https://dashboard.stripe.com/test/dashboard' };
  }
  return stripe.accounts.createLoginLink(stripeAccountId);
};

module.exports = { createConnectAccount, createAccountLink, getAccountDetails, updateRestaurantStripeInfo, createPaymentIntent, confirmPaymentIntent, retrievePaymentIntent, createRefund, getAccountBalance, createLoginLink };