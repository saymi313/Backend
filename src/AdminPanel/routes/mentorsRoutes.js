const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middlewares/auth');
const { authorizeAdmin } = require('../../shared/middlewares/roleAuth');
const {
  getAllMentors,
  getMentorById,
  updateMentorApprovalStatus,
  toggleMentorLoginPause,
  getMentorsByStatus
} = require('../controllers/mentorsController');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorizeAdmin);

// Mentors routes
router.get('/', getAllMentors);
router.get('/by-status', getMentorsByStatus);
router.get('/:id', getMentorById);
router.patch('/:id/approval', updateMentorApprovalStatus);
router.patch('/:id/pause-login', toggleMentorLoginPause);

module.exports = router;

