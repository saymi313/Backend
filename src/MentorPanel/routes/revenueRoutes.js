const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middlewares/auth');
const { checkMentorLoginStatus } = require('../middlewares/mentorAuth');
const { getMentorRevenueDashboard } = require('../controllers/revenueController');

router.use(authenticate);
router.use((req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  if (!['mentor', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return next();
});

router.use((req, res, next) => {
  if (req.user.role === 'mentor') {
    return checkMentorLoginStatus(req, res, next);
  }
  next();
});

router.get('/dashboard', getMentorRevenueDashboard);

module.exports = router;

