const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
// Koristimo isti secret uz dodatak za refresh, ili poseban ako postoji
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || (JWT_SECRET + '_refresh_secret'); 

const JWT_EXPIRES_IN = '15m'; // Kratki access token (15 minuta)
const REFRESH_EXPIRES_IN = '7d'; // Dugi refresh token (7 dana)
const JWT_ISSUER = 'scanandpay';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET_NOT_DEFINED');
}

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
    issuer: JWT_ISSUER,
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER });
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw new Error('JWT_TOKEN_EXPIRED');
    if (error.name === 'JsonWebTokenError') throw new Error('JWT_TOKEN_INVALID');
    throw new Error('JWT_AUTH_FAILED');
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET, { issuer: JWT_ISSUER });
  } catch (error) {
    throw new Error('REFRESH_TOKEN_INVALID_OR_EXPIRED');
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken
};