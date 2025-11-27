const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middlewares/auth');
const { authorize } = require('../../shared/middlewares/roleAuth');
const { checkMentorLoginStatus } = require('../middlewares/mentorAuth');
const {
  createMentorProfile,
  getMentorProfile,
  updateMentorProfile,
  addEducation,
  updateEducation,
  deleteEducation,
  addExperience,
  updateExperience,
  deleteExperience,
  addAchievement,
  deleteAchievement,
  updateAvailability
} = require('../controllers/profileController');

// Apply authentication and mentor role middleware to all routes
router.use(authenticate);
router.use((req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  if (!['mentor', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
});
// Check mentor login status (only for mentors, not admins)
router.use((req, res, next) => {
  if (req.user.role === 'mentor') {
    return checkMentorLoginStatus(req, res, next);
  }
  next();
});

// Mentor profile CRUD routes
router.post('/', createMentorProfile);
router.get('/', getMentorProfile);
router.put('/', updateMentorProfile);

// Education management routes
router.post('/education', addEducation);
router.put('/education/:educationId', updateEducation);
router.delete('/education/:educationId', deleteEducation);

// Experience management routes
router.post('/experience', addExperience);
router.put('/experience/:experienceId', updateExperience);
router.delete('/experience/:experienceId', deleteExperience);

// Achievement management routes
router.post('/achievement', addAchievement);
router.delete('/achievement/:achievementId', deleteAchievement);

// Availability management route
router.put('/availability', updateAvailability);

module.exports = router;
