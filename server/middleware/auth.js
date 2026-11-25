const jwt = require('jsonwebtoken');
const db = require('../db');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return null;
    }
    return 'scentory-dev-fallback-key-change-in-production';
  }
  return secret;
}

function authenticateToken(req, res, next) {
  const secret = getJwtSecret();
  if (!secret) {
    return res.status(503).json({ message: 'Authentication service temporarily unavailable (JWT_SECRET not configured).' });
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, secret, async (err, payload) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired session. Please log in again.' });
    }

    try {
      const user = await db.getUserById(payload.id);
      if (!user) {
        return res.status(404).json({ message: 'User account not found or has been deactivated.' });
      }

      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        city: user.city
      };
      next();
    } catch (dbErr) {
      return res.status(500).json({ message: 'Error retrieving user account.' });
    }
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin privileges required to access this resource.' });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  getJwtSecret,
  get JWT_SECRET() {
    return getJwtSecret();
  }
};
