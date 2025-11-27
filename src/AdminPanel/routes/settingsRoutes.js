const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middlewares/auth');
const { authorizeAdmin } = require('../../shared/middlewares/roleAuth');
const {
  getSettings,
  updateSettings,
  addCategory,
  removeCategory
} = require('../controllers/settingsController');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorizeAdmin);

// Settings routes
router.get('/', getSettings);
router.patch('/', updateSettings);
router.post('/categories', addCategory);
router.delete('/categories', removeCategory);

module.exports = router;

