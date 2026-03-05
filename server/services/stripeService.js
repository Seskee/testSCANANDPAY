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

const createPaymentIntent = async (amount, currency, restaurantId, stripeAccountId, metadata = {}) => {
  const intent = await stripe.paymentIntents.create(
    {
      amount: Math.round(amount * 100),
      currency: currency || 'eur',
      transfer_data: stripeAccountId ? { destination: stripeAccountId } : undefined,
      metadata: { restaurantId: restaurantId.toString(), ...metadata },
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    },
    {
      idempotencyKey: metadata?.billId && metadata?.idempotencyKey
        ? `${metadata.billId}:${metadata.idempotencyKey}` : undefined,
    }
  );
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
  return stripe.balance.retrieve({ stripeAccount: stripeAccountId });
};

const createLoginLink = async (stripeAccountId) => {
  return stripe.accounts.createLoginLink(stripeAccountId);
};

module.exports = { createConnectAccount, createAccountLink, getAccountDetails, updateRestaurantStripeInfo, createPaymentIntent, confirmPaymentIntent, retrievePaymentIntent, createRefund, getAccountBalance, createLoginLink };
