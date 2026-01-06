const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../shared/middlewares/auth');
const { authorizeAdmin } = require('../../shared/middlewares/roleAuth');
const {
  login,
  getMe,
  logout
} = require('../controllers/authController');

const router = express.Router();

// Validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Public routes
router.post('/login', loginValidation, login);

// Protected routes
router.get('/me', authenticate, authorizeAdmin, getMe);
router.post('/logout', authenticate, authorizeAdmin, logout);

module.exports = router;
