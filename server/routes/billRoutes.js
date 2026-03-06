// server/routes/billRoutes.js
const express = require('express');
const router = express.Router();
const billService = require('../services/billService');
const { authenticateToken } = require('./middleware/auth');
const { getDB } = require('../config/database'); // Potrebno za IDOR provjeru

// HELPER: Sigurnosna provjera vlasništva restorana nad računom
const verifyBillOwnership = async (billId, userId) => {
  const db = getDB();
  const bill = await db.getBillById(billId);
  if (!bill) throw new Error('Bill not found');
  const restaurant = await db.getRestaurantById(bill.restaurant_id);
  if (!restaurant || restaurant.owner_id.toString() !== userId.toString()) {
    throw new Error('Unauthorized access to this bill');
  }
  return true;
};

router.post('/', authenticateToken, async (req, res) => {
  try {
    const billData = req.body;
    if (!billData.restaurant || !billData.tableNumber || !billData.items || billData.items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Zabrani da netko kreira račun za tuđi restoran
    const db = getDB();
    const restaurant = await db.getRestaurantById(billData.restaurant);
    if (!restaurant || restaurant.owner_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized access to this restaurant' });
    }

    const bill = await billService.createBill(billData);
    res.status(201).json({ bill });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUBLIC RUTA - Gosti skeniraju
router.get('/restaurant/:restaurantId/table/:tableNumber', async (req, res) => {
  try {
    const { restaurantId, tableNumber } = req.params;
    const result = await billService.getBillByRestaurantAndTable(restaurantId, tableNumber);
    
    if (!result) return res.status(404).json({ error: 'No active bill found' });
    if (result.fullyPaid) return res.status(410).json(result);
    res.status(200).json({ bill: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PRIVATE RUTA - IDOR ZAŠTITA DODANA
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await verifyBillOwnership(id, req.user._id); // Sigurnosna blokada
    const bill = await billService.getBillById(id);
    res.status(200).json({ bill });
  } catch (error) {
    res.status(error.message.includes('Unauthorized') ? 403 : 404).json({ error: error.message });
  }
});

// PRIVATE RUTA - IDOR ZAŠTITA DODANA
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    // Prisili da backend filtrira račune SAMO po restoranima koje korisnik posjeduje
    const myRestaurants = await db.getRestaurantsByOwnerId(req.user._id);
    const myRestaurantIds = myRestaurants.map(r => r.id);

    const requestedRestaurant = req.query.restaurant;
    
    // Ako je zatražio specifičan restoran, provjeri je li njegov
    if (requestedRestaurant && !myRestaurantIds.includes(requestedRestaurant)) {
        return res.status(403).json({ error: 'Unauthorized access to this restaurant' });
    }

    // Ako nije poslao restoran, vrati prazno (ne dopusti dump cijele baze)
    if (!requestedRestaurant && myRestaurantIds.length === 0) {
        return res.status(200).json({ bills:[] });
    }

    const filters = {
      restaurant: requestedRestaurant || myRestaurantIds[0], // Osiguraj da uvijek ima jedan ID
      status: req.query.status,
      tableNumber: req.query.tableNumber,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };

    const bills = await billService.getAllBills(filters);
    res.status(200).json({ bills });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Ownership provjera je već ukomponirana unutar billService.updateBill u starom kodu
    const bill = await billService.updateBill(id, req.body, req.user._id);
    res.status(200).json({ bill });
  } catch (error) {
    res.status(error.message.includes('Unauthorized') ? 403 : 400).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await billService.deleteBill(req.params.id, req.user._id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.message.includes('Unauthorized') ? 403 : 400).json({ error: error.message });
  }
});

module.exports = router;