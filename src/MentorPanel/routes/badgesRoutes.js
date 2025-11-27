const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middlewares/auth');
const { checkMentorLoginStatus } = require('../middlewares/mentorAuth');
const {
  getMentorBadge,
  getAllBadges,
  getBadgeProgress,
  recalculateBadge
} = require('../controllers/badgesController');

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply mentor role check
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

// Badge routes
router.get('/', getMentorBadge);
router.get('/all', getAllBadges);
router.get('/progress', getBadgeProgress);
router.post('/calculate', recalculateBadge);

module.exports = router;

