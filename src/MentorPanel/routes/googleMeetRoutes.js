const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middlewares/auth');
const { checkMentorLoginStatus } = require('../middlewares/mentorAuth');
const {
  initializeGoogleClient,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getMeeting,
  getAuthUrl,
  getTokens
} = require('../controllers/googleMeetController');

// Apply authentication middleware to all routes
router.use(authenticate);
// Check mentor login status
router.use(checkMentorLoginStatus);

// Google Meet routes
router.post('/initialize', initializeGoogleClient);
router.post('/auth-url', getAuthUrl);
router.post('/tokens', getTokens);
router.post('/meetings', createMeeting);
router.get('/meetings/:eventId', getMeeting);
router.put('/meetings/:eventId', updateMeeting);
router.delete('/meetings/:eventId', deleteMeeting);

module.exports = router;
