const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middlewares/auth');
const { authorize } = require('../../shared/middlewares/roleAuth');
const { checkMentorLoginStatus } = require('../middlewares/mentorAuth');
const {
  getMentorBookings,
  getBookingById,
  updateBookingStatus,
  createMeeting,
  getMentorMeetings,
  startMeeting,
  endMeeting,
  getTodaysMeetings,
  getUpcomingMeetings,
  cancelMeeting,
  deleteMeeting,
  getMeetingsByDateRange,
  getMeetingsByDate,
  getMentorMentees
} = require('../controllers/bookingController');
const { triggerMeetingReminderCheck } = require('../services/notificationService');

// Apply authentication and role middleware to all routes
router.use(authenticate);
router.use((req, res, next) => {
  if (!req.user || req.user.role !== 'mentor') {
    return res.status(403).json({ success: false, message: 'Access denied. Mentor role required.' });
  }
  next();
});
// Check mentor login status
router.use(checkMentorLoginStatus);

// Booking routes
router.get('/bookings', getMentorBookings);
router.get('/bookings/:id', getBookingById);
router.put('/bookings/:id/status', updateBookingStatus);

// Meeting routes
router.get('/meetings', getMentorMeetings);
router.get('/meetings/today', getTodaysMeetings);
router.get('/meetings/upcoming', getUpcomingMeetings);
router.get('/meetings/calendar', getMeetingsByDateRange);
router.get('/meetings/date/:date', getMeetingsByDate);
router.post('/bookings/:bookingId/meetings', createMeeting);
router.put('/meetings/:id/start', startMeeting);
router.put('/meetings/:id/end', endMeeting);
router.put('/meetings/:id/cancel', cancelMeeting);
router.delete('/meetings/:id', deleteMeeting);

// Mentee routes (for meeting scheduling)
router.get('/mentees', getMentorMentees);

// Meeting reminder check endpoint (can be triggered manually or by cron)
router.post('/meetings/check-reminders', triggerMeetingReminderCheck);

module.exports = router;
