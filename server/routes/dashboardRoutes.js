// server/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./middleware/auth');
const dashboardService = require('../services/dashboardService');
const { getDB } = require('../config/database');

const getRestaurantForUser = async (userId) => {
  const db = getDB();
  const restaurants = await db.getRestaurantsByOwnerId(userId);
  return restaurants[0] || null;
};

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) return res.status(400).json({ error: 'No restaurant associated with this account' });
    const summary = await dashboardService.getDashboardSummary(restaurant.id);
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/revenue/daily', authenticateToken, async (req, res) => {
  try {
    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) return res.status(400).json({ error: 'No restaurant associated with this account' });
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    if (isNaN(targetDate.getTime())) return res.status(400).json({ error: 'Invalid date format' });
    const result = await dashboardService.getDailyRevenue(restaurant.id, targetDate);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/revenue/monthly', authenticateToken, async (req, res) => {
  try {
    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) return res.status(400).json({ error: 'No restaurant associated with this account' });
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year)  : now.getFullYear();
    const result = await dashboardService.getMonthlyRevenue(restaurant.id, month, year);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) return res.status(400).json({ error: 'No restaurant associated with this account' });
    const result = await dashboardService.getTransactionHistory(restaurant.id, {
      startDate: req.query.startDate, endDate: req.query.endDate,
      limit: req.query.limit || 100, skip: req.query.skip || 0,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
