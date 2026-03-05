// server/routes/middleware/ownershipMiddleware.js
const { getDB } = require('../../config/database');

const requireRestaurantOwnership = async (req, res, next) => {
  try {
    // 1. Provjeri postoji li uopće korisnik u requestu (zaštita od rušenja)
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const restaurantId = req.params.restaurantId || req.params.id || req.body.restaurantId || req.query.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ error: 'RESTAURANT_ID_MISSING' });
    }

    const db = getDB();
    const restaurant = await db.getRestaurantById(restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({ error: 'RESTAURANT_NOT_FOUND' });
    }

    // 2. Podrži i stari (Mongo) i novi (Postgres) format ID-a korisnika
    const userId = req.user.id || req.user._id;

    if (!userId) {
      return res.status(401).json({ error: 'USER_ID_MISSING' });
    }

    // 3. Sigurna usporedba ID-eva (pretvaramo u string kako bi izbjegli probleme s tipovima)
    if (restaurant.owner_id.toString() !== userId.toString()) {
      console.warn(`Ownership mismatch: Restaurant owner is ${restaurant.owner_id}, but user is ${userId}`);
      return res.status(403).json({ error: 'FORBIDDEN_RESOURCE' });
    }

    // Spremi restoran u request kako ga iduće rute ne bi morale ponovno tražiti u bazi
    req.restaurant = restaurant;
    next();
  } catch (error) {
    console.error('Ownership check error:', error.message);
    return res.status(500).json({ error: 'OWNERSHIP_CHECK_FAILED' });
  }
};

module.exports = { requireRestaurantOwnership };