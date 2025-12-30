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

// Search services (must be before /:id)
router.get('/search', searchMentorServices);

// Get service categories (must be before /:id)
router.get('/meta/categories', getMentorServiceCategories);

// Get featured services (must be before /:id)
router.get('/meta/featured', getFeaturedMentorServices);

// Get popular services (must be before /:id)
router.get('/meta/popular', getPopularMentorServices);

// Get services by category (must be before /:id)
router.get('/category/:category', getMentorServicesByCategory);

// Get services by mentor (must be before /:id)
router.get('/mentor/:mentorId', getMentorServicesByMentor);

// Get service by Mentor & Service Slug (NEW)
router.get('/details/:mentorSlug/:serviceSlug', require('../controllers/serviceController').getServiceByMentorAndSlug);

// Get service by ID (must be last to avoid catching other routes)
router.get('/:id', getMentorServiceById);

module.exports = router;
