const express = require('express');
const router = express.Router();
const {
  getAllMentors,
  getMentorById,
  searchMentors,
  getMentorsBySpecialization,
  getMentorSpecializations,
  getFeaturedMentors,
  getMentorStudents
} = require('../controllers/mentorController');

// Public mentor discovery routes (no authentication required)

// Get all mentors with filtering and pagination
router.get('/', getAllMentors);

// Get mentor by ID (public profile)
router.get('/:id', getMentorById);

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

module.exports = router;
