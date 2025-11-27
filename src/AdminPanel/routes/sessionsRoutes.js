const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middlewares/auth');
const { authorizeAdmin } = require('../../shared/middlewares/roleAuth');
const {
  getAllSessions,
  getSessionById
} = require('../controllers/sessionsController');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorizeAdmin);

// Sessions routes
router.get('/', getAllSessions);
router.get('/:id', getSessionById);

module.exports = router;

