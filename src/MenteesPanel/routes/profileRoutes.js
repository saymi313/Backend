const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middlewares/auth');
const {
  createMenteeProfile,
  getMenteeProfile,
  updateMenteeProfile,
  updateStudyGoals,
  updateTargetCountries,
  updateAcademicInterests,
  updateCareerGoals,
  updatePreferences,
  updateChallenges,
  getProfileCompleteness
} = require('../controllers/profileController');

// Apply authentication middleware to all routes
router.use(authenticate);

// Mentee profile CRUD routes
router.post('/', createMenteeProfile);
router.get('/', getMenteeProfile);
router.put('/', updateMenteeProfile);

// Specific profile sections
router.put('/goals', updateStudyGoals);
router.put('/countries', updateTargetCountries);
router.put('/interests', updateAcademicInterests);
router.put('/career-goals', updateCareerGoals);
router.put('/preferences', updatePreferences);
router.put('/challenges', updateChallenges);

// Profile completeness
router.get('/completeness', getProfileCompleteness);

module.exports = router;
