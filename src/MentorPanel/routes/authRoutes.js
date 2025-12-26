const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../shared/middlewares/auth');
const { authorizeMentor } = require('../../shared/middlewares/roleAuth');
const { checkMentorLoginStatus } = require('../middlewares/mentorAuth');
const {
  register,
  login,
  getMe,
  logout
} = require('../controllers/authController');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name is required')
];

const loginValidation = [
  body('email')
    .isEmail()
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.get('/me', authenticate, authorizeMentor, checkMentorLoginStatus, getMe);
router.post('/logout', authenticate, authorizeMentor, checkMentorLoginStatus, logout);

module.exports = router;
