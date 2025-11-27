const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middlewares/auth');
const { authorize } = require('../../shared/middlewares/roleAuth');
const {
  createBooking,
  getMenteeBookings,
  getBookingById,
  cancelBooking,
  getMenteeMeetings,
  getMeetingById,
  joinMeeting,
  getTodaysMeetings,
  getUpcomingMeetings,
  leaveMeetingFeedback
} = require('../controllers/bookingController');

// Apply authentication and role middleware to all routes
router.use(authenticate);
router.use((req, res, next) => {
  if (!req.user || req.user.role !== 'mentee') {
    return res.status(403).json({ success: false, message: 'Access denied. Mentee role required.' });
  }
  next();
});

// Booking routes
router.post('/bookings', createBooking);
router.get('/bookings', getMenteeBookings);
router.get('/bookings/:id', getBookingById);
router.put('/bookings/:id/cancel', cancelBooking);

// Meeting routes
router.get('/meetings', getMenteeMeetings);
router.get('/meetings/today', getTodaysMeetings);
router.get('/meetings/upcoming', getUpcomingMeetings);
router.get('/meetings/:id', getMeetingById);
router.post('/meetings/:id/join', joinMeeting);
router.post('/meetings/:id/feedback', leaveMeetingFeedback);

module.exports = router;
