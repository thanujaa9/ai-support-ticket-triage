const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', authenticate, customerController.listCustomers);
router.get('/:id', authenticate, customerController.getCustomerById);

module.exports = router;
