const express = require('express');
const router = express.Router();
const {
  getDashboardMetrics,
  getRevenueChart,
  getUsersByCountry,
  getTopServices,
  getMentorLeaderboard,
  getTransactionsChart
} = require('../controllers/dashboardController');
const { authenticate } = require('../../shared/middlewares/auth');
const { authorizeAdmin } = require('../../shared/middlewares/roleAuth');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorizeAdmin);

// Dashboard routes
router.get('/metrics', getDashboardMetrics);
router.get('/revenue-chart', getRevenueChart);
router.get('/users-by-country', getUsersByCountry);
router.get('/top-services', getTopServices);
router.get('/mentor-leaderboard', getMentorLeaderboard);
router.get('/transactions-chart', getTransactionsChart);

module.exports = router;

