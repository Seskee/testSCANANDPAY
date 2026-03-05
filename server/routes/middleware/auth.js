// server/routes/middleware/auth.js
const { verifyToken } = require('../../utils/jwt');
const { getDB } = require('../../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });

    const decoded = verifyToken(token);
    const db = getDB();
    const user = await db.getUserById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'Invalid token - user not found' });

    req.user = { ...user, id: user.id, _id: user.id };
    next();
  } catch (error) {
    console.error('Auth greška:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticateToken };
