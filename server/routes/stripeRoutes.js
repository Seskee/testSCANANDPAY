// server/routes/stripeRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./middleware/auth');
const stripeService = require('../services/stripeService');
const { getDB } = require('../config/database');

router.post('/connect/onboard', authenticateToken, async (req, res) => {
  try {
    const { restaurantId, refreshUrl, returnUrl } = req.body;
    if (!restaurantId || !refreshUrl || !returnUrl)
      return res.status(400).json({ error: 'Missing required fields: restaurantId, refreshUrl, returnUrl' });

    const db = getDB();
    const restaurant = await db.getRestaurantById(restaurantId);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    if (restaurant.owner_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    let stripeAccountId = restaurant.stripe_account_id;
    if (!stripeAccountId) {
      const account = await stripeService.createConnectAccount(restaurant.id, req.user.email, restaurant.name);
      stripeAccountId = account.id;
      await db.updateStripeAccountStatus(restaurantId, { stripe_account_id: stripeAccountId, stripe_account_status: 'pending' });
    }

    const accountLink = await stripeService.createAccountLink(stripeAccountId, restaurantId, refreshUrl, returnUrl);
    res.status(200).json({ url: accountLink.url, accountId: stripeAccountId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/connect/status/:restaurantId', authenticateToken, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const db = getDB();
    const restaurant = await db.getRestaurantById(restaurantId);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    if (restaurant.owner_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    if (!restaurant.stripe_account_id) {
      return res.status(200).json({ accountId: null, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false, onboardingComplete: false });
    }

    const accountDetails = await stripeService.getAccountDetails(restaurant.stripe_account_id);
    await stripeService.updateRestaurantStripeInfo(restaurantId, accountDetails);
    res.status(200).json({
      accountId: accountDetails.id,
      chargesEnabled: accountDetails.chargesEnabled,
      payoutsEnabled: accountDetails.payoutsEnabled,
      detailsSubmitted: accountDetails.detailsSubmitted,
      onboardingComplete: accountDetails.chargesEnabled && accountDetails.detailsSubmitted,
      requirements: accountDetails.requirements,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/connect/dashboard', authenticateToken, async (req, res) => {
  try {
    const { restaurantId } = req.body;
    if (!restaurantId) return res.status(400).json({ error: 'Missing restaurantId' });
    const db = getDB();
    const restaurant = await db.getRestaurantById(restaurantId);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    if (restaurant.owner_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    if (!restaurant.stripe_account_id) return res.status(400).json({ error: 'Stripe Connect not set up' });

    const loginLink = await stripeService.createLoginLink(restaurant.stripe_account_id);
    res.status(200).json({ url: loginLink.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/connect/balance/:restaurantId', authenticateToken, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const db = getDB();
    const restaurant = await db.getRestaurantById(restaurantId);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    if (restaurant.owner_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    if (!restaurant.stripe_account_id) return res.status(400).json({ error: 'Stripe Connect not set up' });

    const balance = await stripeService.getAccountBalance(restaurant.stripe_account_id);
    res.status(200).json({ available: balance.available, pending: balance.pending });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
