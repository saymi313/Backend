const express = require('express');
const router = express.Router();
const {
  createServiceFeedback,
  getServiceFeedbacks,
  getMentorFeedbacks,
  updateServiceFeedback,
  deleteServiceFeedback
} = require('../controllers/feedbackController');
const { authenticate } = require('../../shared/middlewares/auth');

// Create feedback (authenticated)
router.post('/services/:serviceId/feedback', authenticate, createServiceFeedback);

// Get service feedbacks (public)
router.get('/services/:serviceId/feedbacks', getServiceFeedbacks);

// Get mentor feedbacks (public)
router.get('/mentors/:mentorId/feedbacks', getMentorFeedbacks);

// Update feedback (authenticated, own feedback)
router.put('/feedbacks/:id', authenticate, updateServiceFeedback);

// Delete feedback (authenticated, own feedback)
router.delete('/feedbacks/:id', authenticate, deleteServiceFeedback);

module.exports = router;

