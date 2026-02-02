const express = require('express');
const router = express.Router();
const { authenticate, authenticateOptional } = require('../../shared/middlewares/auth'); // Add auth middleware import
const {
  getAllMentors,
  getMentorById,
  searchMentors,
  getMentorsBySpecialization,
  getMentorSpecializations,
  getFeaturedMentors,
  getMentorStudents,
  getMentorFollowers,
  followMentor,
  unfollowMentor
} = require('../controllers/mentorController');

// Public mentor discovery routes (no authentication required)

// Get all mentors with filtering and pagination
router.get('/', getAllMentors);

// Get mentor by ID (public profile, but supports optional auth for follow status)
router.get('/:id', authenticateOptional, getMentorById);

// Search mentors
router.get('/search', searchMentors);

// Get mentors by specialization
router.get('/specialization/:specialization', getMentorsBySpecialization);

// Get available specializations for filters
router.get('/meta/specializations', getMentorSpecializations);

// Get featured mentors (top rated)
router.get('/meta/featured', getFeaturedMentors);

// Get students associated with a mentor
router.get('/:id/students', getMentorStudents);

// Get followers of a mentor
router.get('/:id/followers', getMentorFollowers);

// Authenticated routes below
// Follow a mentor
router.post('/:id/follow', authenticate, followMentor);

// Unfollow a mentor
router.delete('/:id/follow', authenticate, unfollowMentor);

module.exports = router;
