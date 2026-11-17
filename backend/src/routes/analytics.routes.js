const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All analytics require authentication
router.use(authenticate);

router.get('/overview', analyticsController.getOverviewMetrics);
router.get('/breakdown', analyticsController.getDistributionBreakdown);
router.get('/employee-performance', analyticsController.getEmployeePerformance);
router.get('/trends', analyticsController.getWeeklyTrends);
router.get('/prompt-performance', analyticsController.getPromptPerformance);

module.exports = router;
