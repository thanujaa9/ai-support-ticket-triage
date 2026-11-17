const env = require('../config/env');

/**
 * Centralized API Error Handling Middleware
 * Converts uncaught exceptions and database constraint errors into clean JSON
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Error caught by middleware]:', err);

  // PostgreSQL Unique Constraint Violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'Conflict: A record with this unique value already exists.',
      detail: err.detail,
    });
  }

  // PostgreSQL Foreign Key Violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'Invalid reference: The referenced ID does not exist.',
      detail: err.detail,
    });
  }

  // PostgreSQL Check Constraint Violation
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      error: 'Constraint violation: Submitted value is outside allowed options.',
      detail: err.detail,
    });
  }

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    error: err.message || 'Internal Server Error',
  };

  if (env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  errorHandler,
};
