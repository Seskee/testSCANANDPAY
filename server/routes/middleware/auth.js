// server/routes/middleware/auth.js
const { verifyToken } = require('../../utils/jwt');
const { getDB } = require('../../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    let token;
    
    // 1. Provjeri Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'You are not logged in. Please log in to get access.' });
    }

    // 2. Verificiraj token
    const decoded = verifyToken(token);

    // 3. Provjeri postoji li korisnik još uvijek u bazi
    const db = getDB();
    const currentUser = await db.getUserById(decoded.id || decoded.userId);
    
    if (!currentUser) {
      return res.status(401).json({ error: 'The user belonging to this token no longer exists.' });
    }

    // 🔒 1000% SECURE FIX: Ako je refresh_token null, korisnik se odjavio!
    // Ovo sprječava korištenje ukradenog access tokena nakon logout-a
    if (!currentUser.refresh_token) {
      return res.status(401).json({ error: 'Session terminated. Please log in again.' });
    }

    // 4. Stavi korisnika u request objekt
    req.user = { ...currentUser, id: currentUser.id, _id: currentUser.id };
    next();
  } catch (error) {
    console.error('Auth Error:', error.message);
    if (error.message === 'JWT_TOKEN_EXPIRED') {
      return res.status(401).json({ error: 'Your token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
};

module.exports = { authenticateToken };