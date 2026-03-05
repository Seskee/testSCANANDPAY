// server/services/restaurantService.js
const { getDB } = require('../config/database');

const createRestaurant = async (restaurantData, ownerId) => {
  const db = getDB();
  
  // Spljošti adresu ako dolazi kao objekt s frontenda
  let flatData = { ...restaurantData };
  if (restaurantData.address && typeof restaurantData.address === 'object') {
    flatData.address = restaurantData.address.street || restaurantData.address.address || '';
    flatData.city = restaurantData.address.city || flatData.city || '';
    flatData.postal_code = restaurantData.address.postalCode || flatData.postal_code || '';
    flatData.country = restaurantData.address.country || flatData.country || '';
  }

  const restaurant = await db.createRestaurant({ ...flatData, owner_id: ownerId });
  console.log(`Novi restoran: ${restaurant.name} (ID: ${restaurant.id})`);
  return restaurant;
};

const getRestaurants = async (ownerId = null, activeOnly = true) => {
  const db = getDB();
  if (ownerId) return db.getRestaurantsByOwnerId(ownerId);
  // Dohvati sve restorane (admin) — direktan query
  return db.query('SELECT * FROM restaurants ORDER BY created_at DESC');
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
  if (existing.owner_id !== ownerId.toString()) throw new Error('Unauthorized: You can only update your own restaurants');

  // 1. Spljošti adresu prije filtriranja polja
  let flatUpdateData = { ...updateData };
  if (updateData.address && typeof updateData.address === 'object') {
    flatUpdateData.address = updateData.address.street || updateData.address.address || '';
    if (updateData.address.city) flatUpdateData.city = updateData.address.city;
    if (updateData.address.postalCode) flatUpdateData.postal_code = updateData.address.postalCode;
    if (updateData.address.country) flatUpdateData.country = updateData.address.country;
  }

  // 2. KREIRANJE NOVIH STOLOVA (ako je poslan tableCount)
  if (flatUpdateData.tableCount) {
    const targetCount = parseInt(flatUpdateData.tableCount, 10);
    
    // Dohvati trenutne stolove da znamo od kojeg broja krećemo
    // Podržavamo i direktni db.query i db metode ako postoje
    const tablesResult = await db.query('SELECT table_number FROM tables WHERE restaurant_id = $1', [restaurantId]);
    
    // Ponekad db wrapper vraća { rows: [...] }, ponekad direktno array
    const currentTables = tablesResult.rows ? tablesResult.rows : (Array.isArray(tablesResult) ? tablesResult : []);
    const currentCount = currentTables.length;

    if (targetCount > currentCount) {
      const newTableNumbers = [];
      // Kreiraj samo razliku (npr. ako imaš 10, a želiš 15, kreira 11, 12, 13, 14, 15)
      for (let i = currentCount + 1; i <= targetCount; i++) {
        newTableNumbers.push(String(i));
      }
      
      if (newTableNumbers.length > 0) {
        await db.createTablesBatch(restaurantId, newTableNumbers);
        console.log(`Dodano ${newTableNumbers.length} novih stolova za restoran ${restaurantId}`);
      }
    }
  }

  // 3. Ažuriranje ostalih podataka u tablici restaurants (bez tableCount)
  const allowed = ['name', 'email', 'phone', 'address', 'city', 'postal_code',
                   'country', 'website', 'timezone', 'default_currency', 'auto_send_receipts'];
  const filtered = {};
  
  for (const key of allowed) {
    if (flatUpdateData[key] !== undefined) filtered[key] = flatUpdateData[key];
  }
  
  // Ako smo samo ažurirali stolove, a nismo dirali druge podatke restorana, samo vrati existing
  if (Object.keys(filtered).length === 0) {
    return existing;
  }
  
  return db.updateRestaurant(restaurantId, filtered);
};

const deleteRestaurant = async (restaurantId, ownerId) => {
  const db = getDB();
  const existing = await db.getRestaurantById(restaurantId);
  if (!existing) throw new Error('Restaurant not found');
  if (existing.owner_id !== ownerId.toString()) throw new Error('Unauthorized: You can only delete your own restaurants');
  await db.deleteRestaurant(restaurantId);
  return { success: true, message: 'Restaurant deleted successfully' };
};

const permanentlyDeleteRestaurant = async (restaurantId, ownerId) => {
  return deleteRestaurant(restaurantId, ownerId);
};

module.exports = { createRestaurant, getRestaurants, getRestaurantById, updateRestaurant, deleteRestaurant, permanentlyDeleteRestaurant };