const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/db');

/**
 * Authenticate JWT Bearer token and attach active employee to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid Bearer token.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ success: false, error: 'Invalid authentication token.' });
    }

    // Verify employee still exists and is active in database
    const result = await db.query(
      'SELECT id, name, email, role, is_active FROM employees WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User account no longer exists.' });
    }

    const employee = result.rows[0];
    if (!employee.is_active) {
      return res.status(403).json({ success: false, error: 'Your account has been deactivated.' });
    }

    req.user = employee;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optional authentication middleware: if token is present, populate req.user, but don't reject if absent.
 * Useful for endpoints accessed by both customers and logged-in agents (e.g., ticket creation or public thread viewing).
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const result = await db.query(
          'SELECT id, name, email, role, is_active FROM employees WHERE id = $1 AND is_active = true',
          [decoded.id]
        );
        if (result.rows.length > 0) {
          req.user = result.rows[0];
        }
      } catch (e) {
        // Ignore invalid token in optional auth
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  authenticate,
  optionalAuth,
};
