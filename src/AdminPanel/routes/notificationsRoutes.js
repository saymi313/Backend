const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../shared/middlewares/auth');
const { authorizeAdmin } = require('../../shared/middlewares/roleAuth');
const {
  sendNotification,
  getNotificationHistory
} = require('../controllers/notificationsController');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorizeAdmin);

// Validation rules for sending notification
const sendNotificationValidation = [
  body('segment')
    .notEmpty()
    .withMessage('Segment is required')
    .isIn(['All Mentors', 'All Mentees', 'All Users'])
    .withMessage('Segment must be one of: All Mentors, All Mentees, All Users'),
  body('channel')
    .notEmpty()
    .withMessage('Channel is required')
    .isIn(['In-App', 'Email'])
    .withMessage('Channel must be one of: In-App, Email'),
  body('subject')
    .notEmpty()
    .withMessage('Subject is required')
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Subject must be between 1 and 120 characters'),
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters')
];

// Notification routes
router.post('/send', sendNotificationValidation, sendNotification);
router.get('/history', getNotificationHistory);

module.exports = router;

