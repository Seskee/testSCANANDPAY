// server/services/restaurantService.js
const { getDB } = require('../config/database');

const createRestaurant = async (restaurantData, ownerId) => {
  const db = getDB();

  let flatData = { ...restaurantData };
  if (restaurantData.address && typeof restaurantData.address === 'object') {
    flatData.address    = restaurantData.address.street || restaurantData.address.address || '';
    flatData.city       = restaurantData.address.city || flatData.city || '';
    flatData.postal_code = restaurantData.address.postalCode || flatData.postal_code || '';
    flatData.country    = restaurantData.address.country || flatData.country || '';
  }

  const restaurant = await db.createRestaurant({ ...flatData, owner_id: ownerId });
  console.log(`Novi restoran: ${restaurant.name} (ID: ${restaurant.id})`);
  return restaurant;
};

// 🔒 ISPRAVAK: ownerId više nije opcionalan — uvijek filtriramo po vlasniku
const getRestaurants = async (ownerId) => {
  const db = getDB();
  // Uvijek vraćamo samo restorane tog korisnika — nema "admin" putanje bez posebne role
  return db.getRestaurantsByOwnerId(ownerId);
};

const getRestaurantById = async (restaurantId) => {
  const db = getDB();
  const restaurant = await db.getRestaurantWithOwner(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');
  return restaurant;
};

const updateRestaurant = async (restaurantId, updateData, ownerId) => {
  const db = getDB();
  const existing = await db.getRestaurantById(restaurantId);
  if (!existing) throw new Error('Restaurant not found');
  if (existing.owner_id !== ownerId.toString()) {
    throw new Error('Unauthorized: You can only update your own restaurants');
  }

  let flatUpdateData = { ...updateData };
  if (updateData.address && typeof updateData.address === 'object') {
    flatUpdateData.address = updateData.address.street || updateData.address.address || '';
    if (updateData.address.city)       flatUpdateData.city        = updateData.address.city;
    if (updateData.address.postalCode) flatUpdateData.postal_code = updateData.address.postalCode;
    if (updateData.address.country)    flatUpdateData.country     = updateData.address.country;
  }

  if (flatUpdateData.tableCount) {
    const targetCount = Math.max(1, Math.min(parseInt(flatUpdateData.tableCount, 10), 500));

    // 🔒 ISPRAVAK: db.query vraća array direktno — nema .rows wrappera
    const currentTables = await db.query(
      'SELECT table_number FROM tables WHERE restaurant_id = $1',
      [restaurantId]
    );
    const currentCount = currentTables.length;

    if (targetCount > currentCount) {
      const newTableNumbers = [];
      for (let i = currentCount + 1; i <= targetCount; i++) {
        newTableNumbers.push(String(i));
      }
      if (newTableNumbers.length > 0) {
        await db.createTablesBatch(restaurantId, newTableNumbers);
        console.log(`Dodano ${newTableNumbers.length} novih stolova za restoran ${restaurantId}`);
      }
    }
  }

  const allowed = [
    'name', 'email', 'phone', 'address', 'city', 'postal_code',
    'country', 'website', 'timezone', 'default_currency', 'auto_send_receipts'
  ];
  const filtered = {};
  for (const key of allowed) {
    if (flatUpdateData[key] !== undefined) filtered[key] = flatUpdateData[key];
  }

  if (Object.keys(filtered).length === 0) return existing;

  return db.updateRestaurant(restaurantId, filtered);
};

const deleteRestaurant = async (restaurantId, ownerId) => {
  const db = getDB();
  const existing = await db.getRestaurantById(restaurantId);
  if (!existing) throw new Error('Restaurant not found');
  if (existing.owner_id !== ownerId.toString()) {
    throw new Error('Unauthorized: You can only delete your own restaurants');
  }
  await db.deleteRestaurant(restaurantId);
  return { success: true, message: 'Restaurant deleted successfully' };
};

const permanentlyDeleteRestaurant = async (restaurantId, ownerId) => {
  return deleteRestaurant(restaurantId, ownerId);
};

module.exports = {
  createRestaurant, getRestaurants, getRestaurantById,
  updateRestaurant, deleteRestaurant, permanentlyDeleteRestaurant
};