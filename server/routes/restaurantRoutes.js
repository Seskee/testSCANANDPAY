const { requireRestaurantOwnership } = require('./middleware/ownershipMiddleware');
const express = require('express');
const { authenticateToken } = require('./middleware/auth');
const {
  createRestaurant,
  getRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
  permanentlyDeleteRestaurant
} = require('../services/restaurantService');

const router = express.Router();

// Description: Create a new restaurant
// Endpoint: POST /api/restaurants
// Request: { name: string, description?: string, address?: object, phone?: string, email?: string, tableCount?: number }
// Response: { success: boolean, message: string, restaurant: object }
router.post('/api/restaurants', authenticateToken, async (req, res) => {
  try {
    const { name, description, address, phone, email, tableCount } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({
        error: 'Restaurant name is required'
      });
    }

    if (tableCount && (tableCount < 1 || tableCount > 100)) {
      return res.status(400).json({
        error: 'Table count must be between 1 and 100'
      });
    }

    const restaurantData = {
      name,
      description,
      address,
      phone,
      email,
      tableCount
    };

    const restaurant = await createRestaurant(restaurantData, req.user._id);

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully',
      restaurant
    });
  } catch (error) {
    console.error('Create restaurant error:', error.message);
    console.error(error.stack);
    res.status(400).json({ error: error.message });
  }
});

// Description: Get all restaurants (optionally filtered by current user)
// Endpoint: GET /api/restaurants
// Request: { myRestaurants?: boolean, includeInactive?: boolean }
// Response: { success: boolean, restaurants: Array<object> }
router.get('/api/restaurants', authenticateToken, async (req, res) => {
  try {
    const { myRestaurants, includeInactive } = req.query;

    // If myRestaurants is true, only return restaurants owned by the current user
    const ownerId = myRestaurants === 'true' ? req.user._id : null;
    const activeOnly = includeInactive !== 'true';

    const restaurants = await getRestaurants(ownerId, activeOnly);

    res.json({
      success: true,
      restaurants
    });
  } catch (error) {
    console.error('Get restaurants error:', error.message);
    console.error(error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Description: Get a single restaurant by ID
// Endpoint: GET /api/restaurants/:id
// Request: {}
// Response: { success: boolean, restaurant: object }
router.get('/api/restaurants/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Restaurant ID is required'
      });
    }

    const restaurant = await getRestaurantById(id);

    res.json({
      success: true,
      restaurant
    });
  } catch (error) {
    console.error('Get restaurant by ID error:', error.message);
    console.error(error.stack);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

// Description: Update a restaurant
// Endpoint: PUT /api/restaurants/:id
// Request: { name?: string, description?: string, address?: object, phone?: string, email?: string, tableCount?: number, isActive?: boolean }
// Response: { success: boolean, message: string, restaurant: object }
router.put('/api/restaurants/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({
        error: 'Restaurant ID is required'
      });
    }

    // Validate table count if provided
    if (updateData.tableCount && (updateData.tableCount < 1 || updateData.tableCount > 100)) {
      return res.status(400).json({
        error: 'Table count must be between 1 and 100'
      });
    }

    const restaurant = await updateRestaurant(id, updateData, req.user._id);

    res.json({
      success: true,
      message: 'Restaurant updated successfully',
      restaurant
    });
  } catch (error) {
    console.error('Update restaurant error:', error.message);
    console.error(error.stack);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

// Description: Delete a restaurant (soft delete)
// Endpoint: DELETE /api/restaurants/:id
// Request: { permanent?: boolean }
// Response: { success: boolean, message: string }
router.delete(
  '/api/restaurants/:id',
  authenticateToken,
  requireRestaurantOwnership,
  async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (!id) {
      return res.status(400).json({
        error: 'Restaurant ID is required'
      });
    }

    let result;
    if (permanent === 'true') {
      result = await permanentlyDeleteRestaurant(id, req.user._id);
    } else {
      result = await deleteRestaurant(id, req.user._id);
    }

    res.json(result);
  } catch (error) {
    console.error('Delete restaurant error:', error.message);
    console.error(error.stack);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
