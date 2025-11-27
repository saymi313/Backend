const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middlewares/auth');
const { authorizeAdmin } = require('../../shared/middlewares/roleAuth');
const {
  getAllServices,
  getServicesByCategory
} = require('../controllers/servicesController');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorizeAdmin);

// Services routes
router.get('/', getAllServices);
router.get('/by-category', getServicesByCategory);

module.exports = router;

