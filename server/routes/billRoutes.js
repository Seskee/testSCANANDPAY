const express = require('express');
const router = express.Router();
const billService = require('../services/billService');
const { authenticateToken } = require('./middleware/auth');

// Description: Create a new bill
// Endpoint: POST /api/bills
// Request: { restaurant: ObjectId, tableNumber: number, items: Array<{ name: string, quantity: number, price: number }>, tax?: number, notes?: string }
// Response: { bill: Bill }
router.post('/', authenticateToken, async (req, res) => {
  try {
    const billData = req.body;

    // Validate required fields
    if (!billData.restaurant) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    if (!billData.tableNumber) {
      return res.status(400).json({ error: 'Table number is required' });
    }

    if (!billData.items || !Array.isArray(billData.items) || billData.items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Validate items structure
    for (const item of billData.items) {
      if (!item.name || !item.quantity || !item.price) {
        return res.status(400).json({
          error: 'Each item must have name, quantity, and price'
        });
      }
    }

    const bill = await billService.createBill(billData);

    console.log('Bill created via API:', bill._id);
    res.status(201).json({ bill });
  } catch (error) {
    console.error('Error in POST /api/bills:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Description: Get bill by restaurant and table number
// Endpoint: GET /api/bills/restaurant/:restaurantId/table/:tableNumber
// Request: {}
// Response: { bill: Bill | null } | { fullyPaid: boolean, message: string }
router.get('/restaurant/:restaurantId/table/:tableNumber', async (req, res) => {
  try {
    const { restaurantId, tableNumber } = req.params;

    if (!restaurantId || !tableNumber) {
      return res.status(400).json({ error: 'Restaurant ID and table number are required' });
    }

    const result = await billService.getBillByRestaurantAndTable(restaurantId, tableNumber);

    if (!result) {
      return res.status(404).json({ error: 'No active bill found for this table' });
    }

    // Check if the bill is fully paid
    if (result.fullyPaid) {
      console.log('Bill is fully paid for table:', tableNumber);
      return res.status(410).json({
        fullyPaid: true,
        message: result.message
      });
    }

    console.log('Bill retrieved via API for table:', tableNumber);
    res.status(200).json({ bill: result });
  } catch (error) {
    console.error('Error in GET /api/bills/restaurant/:restaurantId/table/:tableNumber:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Description: Get a single bill by ID
// Endpoint: GET /api/bills/:id
// Request: {}
// Response: { bill: Bill }
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await billService.getBillById(id);

    console.log('Bill retrieved via API:', id);
    res.status(200).json({ bill });
  } catch (error) {
    console.error('Error in GET /api/bills/:id:', error.message);

    if (error.message === 'Bill not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(400).json({ error: error.message });
  }
});

// Description: Get all bills with optional filters
// Endpoint: GET /api/bills
// Request: { restaurant?: ObjectId, status?: string, tableNumber?: number, startDate?: string, endDate?: string, limit?: number }
// Response: { bills: Array<Bill> }
router.get('/', authenticateToken, async (req, res) => {
  try {
    const filters = {
      restaurant: req.query.restaurant,
      status: req.query.status,
      tableNumber: req.query.tableNumber,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };

    const bills = await billService.getAllBills(filters);

    console.log('Bills retrieved via API, count:', bills.length);
    res.status(200).json({ bills });
  } catch (error) {
    console.error('Error in GET /api/bills:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Description: Update a bill
// Endpoint: PUT /api/bills/:id
// Request: { items?: Array<Item>, tableNumber?: number, tax?: number, notes?: string, status?: string, payment?: Payment }
// Response: { bill: Bill }
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user._id;

    const bill = await billService.updateBill(id, updateData, userId);

    console.log('Bill updated via API:', id);
    res.status(200).json({ bill });
  } catch (error) {
    console.error('Error in PUT /api/bills/:id:', error.message);

    if (error.message === 'Bill not found') {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(400).json({ error: error.message });
  }
});

// Description: Delete a bill
// Endpoint: DELETE /api/bills/:id
// Request: {}
// Response: { message: string } | { bill: Bill }
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await billService.deleteBill(id, userId);

    console.log('Bill deleted via API:', id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in DELETE /api/bills/:id:', error.message);

    if (error.message === 'Bill not found') {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
