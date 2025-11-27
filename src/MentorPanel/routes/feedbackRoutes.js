const express = require('express');
const router = express.Router();
const {
  getMentorFeedbacks
} = require('../controllers/feedbackController');
const { authenticate } = require('../../shared/middlewares/auth');
const { checkMentorLoginStatus } = require('../middlewares/mentorAuth');

// Apply authentication middleware
router.use(authenticate);
// Check mentor login status
router.use(checkMentorLoginStatus);

// Get mentor feedbacks (authenticated, mentor only - uses req.user.id)
router.get('/feedbacks', getMentorFeedbacks);

module.exports = router;

