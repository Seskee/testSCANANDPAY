const bcrypt = require('bcrypt');
const { getDB } = require('../config/database');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

// DTO: Filtrira osjetljive podatke prije slanja klijentu
const sanitizeUser = (user, restaurant) => ({
  _id: user.id,
  id: user.id,
  email: user.email,
  name: restaurant?.name || user.first_name,
  tableCount: restaurant?.table_count || 10,
  restaurantId: restaurant?.id
});

const registerUser = async (userData) => {
  const { email, password, restaurantName, tableCount = 10 } = userData;
  const db = getDB();

  const existing = await db.getUserByEmail(email.toLowerCase().trim());
  if (existing) throw new Error('User with this email already exists');

  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(password, salt);

  const user = await db.createUser({
    email: email.toLowerCase().trim(),
    password_hash,
    first_name: restaurantName,
  });

  const restaurant = await db.createRestaurant({
    owner_id: user.id,
    name: restaurantName,
    email: email.toLowerCase().trim(),
    country: 'HR',
    default_currency: 'EUR',
    timezone: 'Europe/Zagreb',
    table_count: tableCount // FIX: Dodano spremanje broja stolova
  });

  const tableNumbers = Array.from({ length: tableCount }, (_, i) => String(i + 1));
  await db.createTablesBatch(restaurant.id, tableNumbers);

  const token = generateToken({ id: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ id: user.id });

  await db.updateRefreshToken(user.id, refreshToken);

  return {
    token,
    refreshToken,
    user: sanitizeUser(user, restaurant),
  };
};

const loginUser = async (credentials) => {
  const { email, password } = credentials;
  const db = getDB();

  const user = await db.getUserByEmail(email.toLowerCase().trim());
  if (!user) throw new Error('Invalid credentials');

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) throw new Error('Invalid credentials');

  const restaurants = await db.getRestaurantsByOwnerId(user.id);
  let restaurant = restaurants[0];

  if (!restaurant) {
    restaurant = await db.createRestaurant({
      owner_id: user.id, name: user.first_name || email, email: user.email,
      country: 'HR', default_currency: 'EUR', timezone: 'Europe/Zagreb',
    });
  }

  await db.updateLastLogin(user.id);
  
  const token = generateToken({ id: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ id: user.id });

  await db.updateRefreshToken(user.id, refreshToken);

  return {
    token,
    refreshToken,
    user: sanitizeUser(user, restaurant),
  };
};

const refreshUserToken = async (refreshToken) => {
  const db = getDB();
  
  const decoded = verifyRefreshToken(refreshToken);
  
  const user = await db.getUserById(decoded.id);
  if (!user || user.refresh_token !== refreshToken) {
    throw new Error('Invalid refresh token');
  }

  const token = generateToken({ id: user.id, email: user.email });
  return { token };
};

module.exports = { registerUser, loginUser, refreshUserToken };