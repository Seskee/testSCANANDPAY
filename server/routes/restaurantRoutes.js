// server/routes/restaurantRoutes.js
const { requireRestaurantOwnership } = require('./middleware/ownershipMiddleware');
const express = require('express');
const { authenticateToken } = require('./middleware/auth');
const {
  createRestaurant, getRestaurants, getRestaurantById,
  updateRestaurant, deleteRestaurant, permanentlyDeleteRestaurant
} = require('../services/restaurantService');

const router = express.Router();

// POST /api/restaurants
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, address, phone, email, tableCount } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ error: 'Restaurant name is required' });
    if (tableCount && (tableCount < 1 || tableCount > 500)) {
      return res.status(400).json({ error: 'Table count must be between 1 and 500' });
    }
    const restaurant = await createRestaurant({ name, description, address, phone, email, tableCount }, req.user._id);
    res.status(201).json({ success: true, message: 'Restaurant created successfully', restaurant });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/restaurants
// 🔒 ISPRAVAK: Uklonjena rupa koja je vraćala sve restorane svih korisnika.
// Svaki autentificirani korisnik vidi SAMO svoje restorane.
// Nema parametra koji može zaobići ovu provjeru.
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Uvijek filtriramo po vlasniku — nema iznimke
    const restaurants = await getRestaurants(req.user._id);
    res.json({ success: true, restaurants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/restaurants/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const restaurant = await getRestaurantById(req.params.id);

    // 🔒 ISPRAVAK: Provjera vlasništva — ne smije gledati tuđi restoran
    if (restaurant.owner_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized access to this restaurant' });
    }

    res.json({ success: true, restaurant });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message });
  }
});

// PUT /api/restaurants/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.body.tableCount && (req.body.tableCount < 1 || req.body.tableCount > 500)) {
      return res.status(400).json({ error: 'Table count must be between 1 and 500' });
    }
    const restaurant = await updateRestaurant(req.params.id, req.body, req.user._id);
    res.json({ success: true, message: 'Restaurant updated successfully', restaurant });
  } catch (error) {
    if (error.message.includes('not found'))   return res.status(404).json({ error: error.message });
    if (error.message.includes('Unauthorized')) return res.status(403).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/restaurants/:id
router.delete('/:id', authenticateToken, requireRestaurantOwnership, async (req, res) => {
  try {
    const result = req.query.permanent === 'true'
      ? await permanentlyDeleteRestaurant(req.params.id, req.user._id)
      : await deleteRestaurant(req.params.id, req.user._id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;