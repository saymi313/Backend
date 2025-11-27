const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middlewares/auth');
const { authorizeAdmin } = require('../../shared/middlewares/roleAuth');
const {
  getAllFeedbacks,
  updateFeedbackVisibility,
  deleteFeedback,
  updateFeedbackResponse,
  getContactMessages,
  respondToContactMessage
} = require('../controllers/reviewsController');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorizeAdmin);

// Reviews/Feedbacks routes
router.get('/', getAllFeedbacks);
router.patch('/:id/visibility', updateFeedbackVisibility);
router.delete('/:id', deleteFeedback);
router.patch('/:id/response', updateFeedbackResponse);

// Contact messages routes
router.get('/contact-messages', getContactMessages);
router.post('/contact-messages/:id/respond', respondToContactMessage);

module.exports = router;

