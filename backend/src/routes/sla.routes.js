const express = require('express');
const router = express.Router();
const slaController = require('../controllers/sla.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

// Authenticated employees can view SLAs
router.get('/', authenticate, slaController.listSlaPolicies);

// Admin can update SLA policies
router.put('/:id', authenticate, requireRole('admin'), slaController.updateSlaPolicy);

module.exports = router;
