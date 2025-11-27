const express = require('express');
const router = express.Router();
const {
  getAllMentorServices,
  getMentorServiceById,
  searchMentorServices,
  getMentorServicesByCategory,
  getMentorServicesByMentor,
  getMentorServiceCategories,
  getFeaturedMentorServices,
  getPopularMentorServices
} = require('../controllers/serviceController');

// Public service discovery routes (no authentication required)

// Get all approved services
router.get('/', getAllMentorServices);

// Get service by ID
router.get('/:id', getMentorServiceById);

// Search services
router.get('/search', searchMentorServices);

// Get services by category
router.get('/category/:category', getMentorServicesByCategory);

// Get services by mentor
router.get('/mentor/:mentorId', getMentorServicesByMentor);

// Get service categories
router.get('/meta/categories', getMentorServiceCategories);

// Get featured services
router.get('/meta/featured', getFeaturedMentorServices);

// Get popular services
router.get('/meta/popular', getPopularMentorServices);

module.exports = router;
