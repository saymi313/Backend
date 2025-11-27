const GoogleMeetService = require('../../shared/services/googleMeetService');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');
const {
  getGoogleOAuthCredentials,
  persistTokens,
  resetCachedCredentials,
} = require('../../shared/utils/helpers/googleMeetCredentialStore');
const Meeting = require('../../shared/models/Meeting');
const Notification = require('../../shared/models/Notification');
const { emitToUser } = require('../../shared/config/socket');

// Initialize Google Meet service
const googleMeetService = new GoogleMeetService();

const ensureGoogleClientInitialized = () => {
  const credentials = getGoogleOAuthCredentials();

  if (!credentials.clientId || !credentials.clientSecret) {
    throw new Error('Google OAuth client credentials are not configured.');
  }

  const result = googleMeetService.initializeClient(credentials);

  if (!result.success) {
    throw new Error(result.error || 'Failed to initialize Google OAuth client');
  }

  return {
    ...credentials,
    calendarReady: result.calendarReady,
  };
};

// Initialize Google API client
const initializeGoogleClient = async (req, res) => {
  try {
    const providedCredentials = req.body?.credentials;
    let credentialsToUse = providedCredentials;

    if (!credentialsToUse || !credentialsToUse.clientId || !credentialsToUse.clientSecret) {
      credentialsToUse = getGoogleOAuthCredentials();
    }

    if (!credentialsToUse.clientId || !credentialsToUse.clientSecret) {
      return sendErrorResponse(res, 'Google API credentials are required. Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.', 400);
    }

    const result = googleMeetService.initializeClient(credentialsToUse);

    if (result.success) {
      return sendSuccessResponse(res, 'Google API client initialized successfully', {
        calendarReady: result.calendarReady,
      });
    }

    return sendErrorResponse(res, result.error, 500);
  } catch (error) {
    console.error('Error initializing Google client:', error);
    return sendErrorResponse(res, 'Failed to initialize Google client', 500);
  }
};

// Create Google Meet meeting and save to database
const createMeeting = async (req, res) => {
  try {
    let credentials;

    try {
      credentials = ensureGoogleClientInitialized();
    } catch (initError) {
      return sendErrorResponse(res, initError.message, 500);
    }

    if (!credentials.calendarReady) {
      return sendErrorResponse(res, 'Google Calendar access is not authorized yet. Complete the OAuth consent flow first.', 428);
    }

    const {
      title,
      description,
      startTime,
      endTime,
      attendees = [],
      timezone = 'UTC',
      menteeId,
      bookingId = null
    } = req.body;

    // Validate required fields
    if (!title || !startTime || !endTime) {
      return sendErrorResponse(res, 'Title, start time, and end time are required', 400);
    }

    if (!menteeId) {
      return sendErrorResponse(res, 'Mentee ID is required', 400);
    }

    // Validate time format
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return sendErrorResponse(res, 'Invalid date format', 400);
    }

    if (start >= end) {
      return sendErrorResponse(res, 'End time must be after start time', 400);
    }

    const meetingDetails = {
      title,
      description,
      startTime,
      endTime,
      attendees,
      timezone
    };

    const result = await googleMeetService.createMeeting(meetingDetails);
    
    if (result.success) {
      const mentorId = req.user.id;
      const duration = Math.round((end - start) / (1000 * 60)); // Duration in minutes
      const googleEventId = result.eventId;
      const googleCalendarLink = result.calendarEvent?.htmlLink || null;

      // Save meeting to database
      const meeting = new Meeting({
        bookingId: bookingId || null,
        menteeId,
        mentorId,
        title,
        description: description || '',
        meetingLink: result.meetingLink,
        meetingId: result.meetingId,
        googleEventId,
        googleCalendarLink,
        scheduledDate: start,
        duration,
        status: 'scheduled',
        meetingType: 'google-meet',
        participants: [
          { userId: menteeId, role: 'mentee' },
          { userId: mentorId, role: 'mentor' }
        ]
      });

      await meeting.save();

      // Create notification for mentee with Google Meet link
      try {
        // Format scheduled date for message
        const scheduledDate = new Date(start);
        const formattedDate = scheduledDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const notification = await Notification.createNotification({
          userId: menteeId,
          type: 'meeting_scheduled',
          title: 'Meeting Scheduled',
          message: `Your mentor has scheduled a meeting: "${title}" on ${formattedDate}.`,
          data: {
            meetingId: meeting._id,
            bookingId: bookingId,
            meetingLink: result.meetingLink,
            scheduledDate: start,
            duration: duration
          },
          priority: 'high',
          actionUrl: '/mentees/bookings', // Redirect to bookings/meetings page
          actionText: 'View Meeting'
        });

        // Emit notification via socket to mentee if online
        try {
          const notificationEmitted = emitToUser(menteeId.toString(), 'notification:new', {
            notification: notification.toJSON()
          });
          console.log(`🔔 Meeting scheduled notification emitted to mentee: ${notificationEmitted ? 'YES' : 'NO (offline)'}`);
        } catch (socketError) {
          console.warn('⚠️ Error emitting meeting notification via socket:', socketError);
        }
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the request if notification fails
      }

      return sendSuccessResponse(res, 'Google Meet meeting created successfully', {
        meetingLink: result.meetingLink,
        meetingId: result.meetingId,
        eventId: result.eventId,
        calendarEvent: result.calendarEvent,
        meeting: meeting
      });
    } else {
      return sendErrorResponse(res, result.error, 500);
    }
  } catch (error) {
    console.error('Error creating Google Meet meeting:', error);
    return sendErrorResponse(res, 'Failed to create Google Meet meeting', 500);
  }
};

// Update Google Meet meeting
const updateMeeting = async (req, res) => {
  try {
    let credentials;

    try {
      credentials = ensureGoogleClientInitialized();
    } catch (initError) {
      return sendErrorResponse(res, initError.message, 500);
    }

    if (!credentials.calendarReady) {
      return sendErrorResponse(res, 'Google Calendar access is not authorized yet. Complete the OAuth consent flow first.', 428);
    }

    const { eventId } = req.params;
    const {
      title,
      description,
      startTime,
      endTime,
      attendees = []
    } = req.body;

    if (!eventId) {
      return sendErrorResponse(res, 'Event ID is required', 400);
    }

    const meetingDetails = {
      title,
      description,
      startTime,
      endTime,
      attendees
    };

    const result = await googleMeetService.updateMeeting(eventId, meetingDetails);
    
    if (result.success) {
      return sendSuccessResponse(res, 'Google Meet meeting updated successfully', {
        meetingLink: result.meetingLink,
        meetingId: result.meetingId,
        eventId: result.eventId
      });
    } else {
      return sendErrorResponse(res, result.error, 500);
    }
  } catch (error) {
    console.error('Error updating Google Meet meeting:', error);
    return sendErrorResponse(res, 'Failed to update Google Meet meeting', 500);
  }
};

// Delete Google Meet meeting
const deleteMeeting = async (req, res) => {
  try {
    let credentials;

    try {
      credentials = ensureGoogleClientInitialized();
    } catch (initError) {
      return sendErrorResponse(res, initError.message, 500);
    }

    if (!credentials.calendarReady) {
      return sendErrorResponse(res, 'Google Calendar access is not authorized yet. Complete the OAuth consent flow first.', 428);
    }

    const { eventId } = req.params;

    if (!eventId) {
      return sendErrorResponse(res, 'Event ID is required', 400);
    }

    const result = await googleMeetService.deleteMeeting(eventId);
    
    if (result.success) {
      return sendSuccessResponse(res, 'Google Meet meeting deleted successfully');
    } else {
      return sendErrorResponse(res, result.error, 500);
    }
  } catch (error) {
    console.error('Error deleting Google Meet meeting:', error);
    return sendErrorResponse(res, 'Failed to delete Google Meet meeting', 500);
  }
};

// Get Google Meet meeting details
const getMeeting = async (req, res) => {
  try {
    let credentials;

    try {
      credentials = ensureGoogleClientInitialized();
    } catch (initError) {
      return sendErrorResponse(res, initError.message, 500);
    }

    if (!credentials.calendarReady) {
      return sendErrorResponse(res, 'Google Calendar access is not authorized yet. Complete the OAuth consent flow first.', 428);
    }

    const { eventId } = req.params;

    if (!eventId) {
      return sendErrorResponse(res, 'Event ID is required', 400);
    }

    const result = await googleMeetService.getMeeting(eventId);
    
    if (result.success) {
      return sendSuccessResponse(res, 'Meeting details retrieved successfully', {
        meeting: result.meeting,
        meetingLink: result.meetingLink
      });
    } else {
      return sendErrorResponse(res, result.error, 500);
    }
  } catch (error) {
    console.error('Error getting meeting details:', error);
    return sendErrorResponse(res, 'Failed to get meeting details', 500);
  }
};

// Get Google OAuth2 authorization URL
const getAuthUrl = async (req, res) => {
  try {
    try {
      ensureGoogleClientInitialized();
    } catch (initError) {
      return sendErrorResponse(res, initError.message, 500);
    }

    const result = googleMeetService.getAuthUrl();

    if (!result.success) {
      return sendErrorResponse(res, result.error, 500);
    }

    return sendSuccessResponse(res, 'Authorization URL generated successfully', {
      authUrl: result.authUrl
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return sendErrorResponse(res, 'Failed to generate authorization URL', 500);
  }
};

// Exchange authorization code for tokens
const getTokens = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return sendErrorResponse(res, 'Authorization code is required', 400);
    }

    let baseCredentials;
    try {
      baseCredentials = ensureGoogleClientInitialized();
    } catch (initError) {
      return sendErrorResponse(res, initError.message, 500);
    }

    const result = await googleMeetService.getTokens(code);

    if (!result.success) {
      return sendErrorResponse(res, result.error, 500);
    }

    const tokens = result.tokens || {};

    persistTokens(tokens);
    resetCachedCredentials();

    const initResult = googleMeetService.initializeClient({
      ...baseCredentials,
      accessToken: tokens.access_token || tokens.accessToken,
      refreshToken: tokens.refresh_token || tokens.refreshToken,
    });

    return sendSuccessResponse(res, 'Tokens retrieved successfully', {
      tokens,
      calendarReady: initResult.success && initResult.calendarReady,
    });
  } catch (error) {
    console.error('Error getting tokens:', error);
    return sendErrorResponse(res, 'Failed to get tokens', 500);
  }
};

module.exports = {
  initializeGoogleClient,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getMeeting,
  getAuthUrl,
  getTokens
};
