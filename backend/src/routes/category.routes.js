const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

// Public or Agent can view categories
router.get('/', categoryController.listCategories);

// Admin can create category
router.post('/', authenticate, requireRole('admin'), categoryController.createCategory);

module.exports = router;
