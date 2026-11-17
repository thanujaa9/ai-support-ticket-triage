const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const ticketRoutes = require('./ticket.routes');
const customerRoutes = require('./customer.routes');
const categoryRoutes = require('./category.routes');
const slaRoutes = require('./sla.routes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AI Support Ticket Triage API',
    version: '1.0.0',
  });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/tickets', ticketRoutes);
router.use('/customers', customerRoutes);
router.use('/categories', categoryRoutes);
router.use('/sla', slaRoutes);

module.exports = router;
