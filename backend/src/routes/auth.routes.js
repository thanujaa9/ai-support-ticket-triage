const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

// Public route
router.post('/login', authController.login);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.get('/employees', authenticate, authController.listEmployees);

// Admin-only route
router.post('/register', authenticate, requireRole('admin'), authController.register);

module.exports = router;
