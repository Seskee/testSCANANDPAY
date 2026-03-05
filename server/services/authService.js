const bcrypt = require('bcrypt');
const { getDB } = require('../config/database');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

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
  });

  const tableNumbers = Array.from({ length: tableCount }, (_, i) => String(i + 1));
  await db.createTablesBatch(restaurant.id, tableNumbers);

  console.log(`Novi korisnik: ${email}, restoran: ${restaurantName}`);
  
  const payload = { id: user.id, _id: user.id, email: user.email, restaurantName };
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken({ id: user.id });

  // Spremi refresh token u bazu
  await db.updateRefreshToken(user.id, refreshToken);

  return {
    token,
    refreshToken,
    user: { _id: user.id, id: user.id, email: user.email, name: restaurantName, tableCount, restaurantId: restaurant.id },
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
  console.log(`Korisnik prijavljen: ${email}`);
  
  const payload = { id: user.id, _id: user.id, email: user.email, restaurantName: restaurant.name };
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken({ id: user.id });

  // Spremi refresh token u bazu
  await db.updateRefreshToken(user.id, refreshToken);

  return {
    token,
    refreshToken,
    user: { _id: user.id, id: user.id, email: user.email, name: restaurant.name, tableCount: 10, restaurantId: restaurant.id },
  };
};

const refreshUserToken = async (refreshToken) => {
  const db = getDB();
  
  // 1. Provjeri je li token validan (potpis i rok trajanja)
  const decoded = verifyRefreshToken(refreshToken);
  
  // 2. Provjeri postoji li korisnik i podudara li se token u bazi
  const user = await db.getUserById(decoded.id);
  if (!user || user.refresh_token !== refreshToken) {
    throw new Error('Invalid refresh token');
  }

  const restaurants = await db.getRestaurantsByOwnerId(user.id);
  const restaurant = restaurants[0];

  // 3. Izdaj novi kratkotrajni Access Token
  const token = generateToken({ 
    id: user.id, 
    _id: user.id, 
    email: user.email, 
    restaurantName: restaurant?.name 
  });

  return { token };
};

module.exports = { registerUser, loginUser, refreshUserToken };