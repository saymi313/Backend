const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../shared/middlewares/auth');
const { authorizeMentee, authorizeMentor } = require('../../shared/middlewares/roleAuth');
const {
  register,
  login,
  getMe,
  logout,
  verifyEmail,
  resendVerificationEmail
} = require('../controllers/authController');

const {
  requestPasswordReset,
  verifyOTP,
  resetPassword
} = require('../controllers/passwordResetController');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .isIn(['mentee', 'mentor'])
    .withMessage('Role must be either mentee or mentor'),
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
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Password reset validation rules
const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const verifyOTPValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('otp')
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('OTP must be a 4-digit number')
];

const resetPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/verify-email', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp').isNumeric().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], verifyEmail);
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], resendVerificationEmail);

// Password reset routes (public)
router.post('/forgot-password', forgotPasswordValidation, requestPasswordReset);
router.post('/verify-otp', verifyOTPValidation, verifyOTP);
router.post('/reset-password', resetPasswordValidation, resetPassword);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

module.exports = router;
