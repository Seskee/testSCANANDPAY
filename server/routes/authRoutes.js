const express = require('express');
const { registerUser, loginUser, refreshUserToken } = require('../services/authService');
const { authenticateToken } = require('./middleware/auth');
const { getDB } = require('../config/database');

const router = express.Router();

// Helper funkcija za postavljanje sigurnog cookie-ja
const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true, // Javascript na frontendu ga ne može čitati (zaštita od XSS)
    secure: process.env.NODE_ENV === 'production', // U produkciji zahtijeva HTTPS
    sameSite: 'strict', // Zaštita od CSRF napada
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dana
  });
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, restaurantName, tableCount } = req.body;

    if (!email || !password || !restaurantName) {
      return res.status(400).json({ error: 'Email, password, and restaurant name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const result = await registerUser({ email, password, restaurantName, tableCount });

    setRefreshCookie(res, result.refreshToken);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token: result.token, // Šaljemo samo kratki token, dugi je u cookie-ju
      restaurant: { ...result.user, _id: result.user.restaurantId },
      user: result.user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await loginUser({ email, password });

    setRefreshCookie(res, result.refreshToken);

    res.json({
      success: true,
      message: 'Login successful',
      token: result.token,
      restaurant: { ...result.user, _id: result.user.restaurantId },
      user: result.user
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Refresh Token endpoint (NOVO)
router.post('/refresh', async (req, res) => {
  try {
    // Ručno parsiranje cookie-ja (da ne moramo instalirati cookie-parser paket)
    const cookieHeader = req.headers.cookie;
    let refreshToken = null;
    
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => c.trim().split('='));
      const refreshCookie = cookies.find(c => c[0] === 'refreshToken');
      if (refreshCookie) refreshToken = refreshCookie[1];
    }

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }

    const result = await refreshUserToken(refreshToken);
    
    res.json({
      success: true,
      token: result.token
    });
  } catch (error) {
    console.error('Refresh token error:', error.message);
    // Ako refresh token ne valja, brišemo cookie sa istim sigurnosnim parametrima
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id || req.user._id;
    
    // Obriši refresh token iz baze
    await db.updateRefreshToken(userId, null);
    
    // Obriši cookie iz preglednika sa ISTIM sigurnosnim parametrima
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user endpoint
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id || req.user._id;

    const restaurants = await db.getRestaurantsByOwnerId(userId);
    let restaurant = restaurants[0];

    if (!restaurant) {
      restaurant = await db.createRestaurant({
        owner_id: userId,
        name: req.user.restaurantName || req.user.name || req.user.email,
        email: req.user.email,
        country: 'HR', default_currency: 'EUR', timezone: 'Europe/Zagreb',
      });
    }

    res.json({
      success: true,
      user: {
        _id: userId,
        email: req.user.email,
        name: req.user.restaurantName || restaurant.name,
        tableCount: req.user.tableCount,
        restaurantId: restaurant.id || restaurant._id
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

module.exports = router;