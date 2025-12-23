const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middlewares/auth');
const { checkMentorLoginStatus } = require('../middlewares/mentorAuth');
const { getMentorDashboardStats, getUpcomingSessions } = require('../controllers/dashboardController');

// Authentication middleware
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

// Mentor login status check
router.use((req, res, next) => {
    if (req.user.role === 'mentor') {
        return checkMentorLoginStatus(req, res, next);
    }
    next();
});

// Routes
router.get('/stats', getMentorDashboardStats);
router.get('/upcoming-sessions', getUpcomingSessions);

module.exports = router;
