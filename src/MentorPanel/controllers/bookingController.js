const Booking = require('../../shared/models/Booking');
const Meeting = require('../../shared/models/Meeting');
const Notification = require('../../shared/models/Notification');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');
const { calculateAndUpdateBadge } = require('./badgesController');
const { emitToUser } = require('../../shared/config/socket');

// Get all bookings for mentor
const getMentorBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const mentorId = req.user.id;

    const query = { mentorId, isActive: true };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('menteeId', 'profile firstName lastName email')
      .populate('serviceId', 'title category packages')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    return sendSuccessResponse(res, 'Mentor bookings retrieved successfully', {
      bookings,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error getting mentor bookings:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentor bookings', 500);
  }
};

// Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const mentorId = req.user.id;

    const booking = await Booking.findOne({ _id: id, mentorId, isActive: true })
      .populate('menteeId', 'profile firstName lastName email phone')
      .populate('serviceId', 'title category packages description')
      .populate('mentorId', 'profile firstName lastName email');

    if (!booking) {
      return sendErrorResponse(res, 'Booking not found', 404);
    }

    return sendSuccessResponse(res, 'Booking retrieved successfully', { booking });
  } catch (error) {
    console.error('Error getting booking:', error);
    return sendErrorResponse(res, 'Failed to retrieve booking', 500);
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const mentorId = req.user.id;

    const booking = await Booking.findOne({ _id: id, mentorId, isActive: true });
    if (!booking) {
      return sendErrorResponse(res, 'Booking not found', 404);
    }

    const oldStatus = booking.status;
    await booking.updateStatus(status, notes);

    // If booking is completed, recalculate mentor badge
    if (status === 'completed' && oldStatus !== 'completed') {
      try {
        await calculateAndUpdateBadge(booking.mentorId);
      } catch (error) {
        console.error('Error updating badge after booking completion:', error);
        // Don't fail the request if badge update fails
      }
    }

    // Create notification for mentee
    await Notification.createNotification({
      userId: booking.menteeId,
      type: `booking_${status}`,
      title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your booking has been ${status} by your mentor.`,
      data: {
        bookingId: booking._id,
        customData: { oldStatus, newStatus: status }
      },
      priority: status === 'confirmed' ? 'high' : 'medium',
      actionUrl: `/mentees/bookings/${booking._id}`,
      actionText: 'View Booking'
    });

    return sendSuccessResponse(res, `Booking ${status} successfully`, { booking });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return sendErrorResponse(res, 'Failed to update booking status', 500);
  }
};

// Create meeting for booking
const createMeeting = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { title, description, meetingLink, meetingPassword, scheduledDate, duration } = req.body;
    const mentorId = req.user.id;

    // Verify booking exists and belongs to mentor
    const booking = await Booking.findOne({ _id: bookingId, mentorId, isActive: true });
    if (!booking) {
      return sendErrorResponse(res, 'Booking not found', 404);
    }

    // Generate meeting ID
    const meetingId = `meet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const meeting = new Meeting({
      bookingId: booking._id,
      menteeId: booking.menteeId,
      mentorId: booking.mentorId,
      title: title || `${booking.serviceId.title} - Meeting`,
      description: description || '',
      meetingLink,
      meetingId,
      meetingPassword,
      scheduledDate: scheduledDate || booking.scheduledDate,
      duration: duration || booking.duration,
      participants: [
        { userId: booking.menteeId, role: 'mentee' },
        { userId: booking.mentorId, role: 'mentor' }
      ]
    });

    await meeting.save();

    // Update booking with meeting link
    booking.meetingLink = meetingLink;
    booking.meetingId = meetingId;
    await booking.save();

    // Send email notification to mentee
    try {
      const emailService = require('../../shared/services/emailService');
      const populatedBooking = await Booking.findById(booking._id)
        .populate('menteeId', 'profile email')
        .populate('mentorId', 'profile');

      if (populatedBooking && populatedBooking.menteeId && populatedBooking.menteeId.email) {
        const menteeName = `${populatedBooking.menteeId.profile.firstName} ${populatedBooking.menteeId.profile.lastName}`;
        const mentorName = `${populatedBooking.mentorId.profile.firstName} ${populatedBooking.mentorId.profile.lastName}`;
        const meetingDateFormatted = meeting.scheduledDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        await emailService.sendMeetingScheduledEmail(
          populatedBooking.menteeId.email,
          menteeName,
          mentorName,
          meeting.title,
          meetingDateFormatted,
          meetingLink,
          meeting.duration
        );
        console.log('✅ Meeting scheduled email sent to mentee');
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send meeting scheduled email (continuing):', emailError.message);
      // Don't fail the request if email fails
    }

    // Create notification for mentee with meeting link
    const formattedDate = meeting.scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const notification = await Notification.createNotification({
      userId: booking.menteeId,
      type: 'meeting_scheduled',
      title: 'Meeting Scheduled',
      message: `Your mentor has scheduled a meeting: "${meeting.title}" on ${formattedDate}.`,
      data: {
        meetingId: meeting._id,
        bookingId: booking._id,
        meetingLink: meetingLink,
        scheduledDate: meeting.scheduledDate,
        duration: meeting.duration
      },
      priority: 'high',
      actionUrl: '/mentees/bookings', // Redirect to bookings/meetings page
      actionText: 'View Meeting'
    });

    // Emit notification via socket to mentee if online
    try {
      const notificationEmitted = emitToUser(booking.menteeId.toString(), 'notification:new', {
        notification: notification.toJSON()
      });
      console.log(`🔔 Meeting scheduled notification emitted to mentee: ${notificationEmitted ? 'YES' : 'NO (offline)'}`);
    } catch (socketError) {
      console.warn('⚠️ Error emitting meeting notification via socket:', socketError);
    }

    return sendSuccessResponse(res, 'Meeting created successfully', { meeting });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return sendErrorResponse(res, 'Failed to create meeting', 500);
  }
};

// Get mentor meetings
const getMentorMeetings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const mentorId = req.user.id;

    const query = { mentorId, isActive: true };
    if (status) {
      query.status = status;
    }

    const meetings = await Meeting.find(query)
      .populate('menteeId', 'profile firstName lastName email')
      .populate('bookingId', 'serviceId totalAmount')
      .sort({ scheduledDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Meeting.countDocuments(query);

    return sendSuccessResponse(res, 'Mentor meetings retrieved successfully', {
      meetings,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error getting mentor meetings:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentor meetings', 500);
  }
};

// Start meeting
const startMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const mentorId = req.user.id;

    const meeting = await Meeting.findOne({ _id: id, mentorId, isActive: true });
    if (!meeting) {
      return sendErrorResponse(res, 'Meeting not found', 404);
    }

    await meeting.startMeeting();

    // Create notification for mentee
    await Notification.createNotification({
      userId: meeting.menteeId,
      type: 'meeting_started',
      title: 'Meeting Started',
      message: 'Your mentor has started the meeting. You can join now.',
      data: {
        meetingId: meeting._id,
        bookingId: meeting.bookingId
      },
      priority: 'urgent',
      actionUrl: `/mentees/meetings/${meeting._id}`,
      actionText: 'Join Meeting'
    });

    return sendSuccessResponse(res, 'Meeting started successfully', { meeting });
  } catch (error) {
    console.error('Error starting meeting:', error);
    return sendErrorResponse(res, 'Failed to start meeting', 500);
  }
};

// End meeting
const endMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, feedback } = req.body;
    const mentorId = req.user.id;

    const meeting = await Meeting.findOne({ _id: id, mentorId, isActive: true });
    if (!meeting) {
      return sendErrorResponse(res, 'Meeting not found', 404);
    }

    await meeting.endMeeting();

    // Update meeting with notes and feedback
    if (notes) meeting.notes = notes;
    if (feedback) {
      meeting.feedback.mentorFeedback = feedback;
    }
    await meeting.save();

    // Create notification for mentee
    await Notification.createNotification({
      userId: meeting.menteeId,
      type: 'meeting_ended',
      title: 'Meeting Ended',
      message: 'Your meeting has ended. Thank you for your time!',
      data: {
        meetingId: meeting._id,
        bookingId: meeting.bookingId
      },
      priority: 'medium',
      actionUrl: `/mentees/meetings/${meeting._id}`,
      actionText: 'View Meeting Summary'
    });

    return sendSuccessResponse(res, 'Meeting ended successfully', { meeting });
  } catch (error) {
    console.error('Error ending meeting:', error);
    return sendErrorResponse(res, 'Failed to end meeting', 500);
  }
};

// Get today's meetings
const getTodaysMeetings = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const meetings = await Meeting.getTodaysMeetings(mentorId, 'mentor');

    return sendSuccessResponse(res, 'Today\'s meetings retrieved successfully', { meetings });
  } catch (error) {
    console.error('Error getting today\'s meetings:', error);
    return sendErrorResponse(res, 'Failed to retrieve today\'s meetings', 500);
  }
};

// Get upcoming meetings
const getUpcomingMeetings = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const meetings = await Meeting.getUpcoming(mentorId, 'mentor');

    return sendSuccessResponse(res, 'Upcoming meetings retrieved successfully', { meetings });
  } catch (error) {
    console.error('Error getting upcoming meetings:', error);
    return sendErrorResponse(res, 'Failed to retrieve upcoming meetings', 500);
  }
};

// Cancel meeting
const cancelMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const mentorId = req.user.id;

    const meeting = await Meeting.findOne({ _id: id, mentorId, isActive: true });
    if (!meeting) {
      return sendErrorResponse(res, 'Meeting not found', 404);
    }

    await meeting.cancelMeeting(reason);

    // Create notification for mentee
    await Notification.createNotification({
      userId: meeting.menteeId,
      type: 'meeting_cancelled',
      title: 'Meeting Cancelled',
      message: `Your meeting has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
      data: {
        meetingId: meeting._id,
        bookingId: meeting.bookingId
      },
      priority: 'high',
      actionUrl: `/mentees/meetings/${meeting._id}`,
      actionText: 'View Details'
    });

    return sendSuccessResponse(res, 'Meeting cancelled successfully', { meeting });
  } catch (error) {
    console.error('Error cancelling meeting:', error);
    return sendErrorResponse(res, 'Failed to cancel meeting', 500);
  }
};

// Delete meeting (permanently remove from database)
const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const mentorId = req.user.id;

    const meeting = await Meeting.findOne({ _id: id, mentorId }).populate('menteeId', 'profile firstName lastName email');
    if (!meeting) {
      return sendErrorResponse(res, 'Meeting not found', 404);
    }

    // Only allow deletion of scheduled meetings (upcoming meetings)
    if (meeting.status !== 'scheduled') {
      return sendErrorResponse(res, `Cannot delete a meeting with status: ${meeting.status}. Only scheduled (upcoming) meetings can be deleted.`, 400);
    }

    // Store meeting details before deletion for notification
    const meetingTitle = meeting.title;
    const menteeId = meeting.menteeId;
    const googleEventId = meeting.googleEventId;

    // Delete Google Calendar event if it exists
    if (googleEventId) {
      try {
        const GoogleMeetService = require('../../shared/services/googleMeetService');
        const {
          getGoogleOAuthCredentials,
        } = require('../../shared/utils/helpers/googleMeetCredentialStore');
        const googleMeetService = new GoogleMeetService();

        const credentials = getGoogleOAuthCredentials();
        if (credentials && credentials.clientId && credentials.clientSecret) {
          const initResult = googleMeetService.initializeClient(credentials);
          if (initResult.success && initResult.calendarReady) {
            const deleteResult = await googleMeetService.deleteMeeting(googleEventId);
            if (deleteResult.success) {
              console.log('✅ Google Calendar event deleted:', googleEventId);
            } else {
              console.warn('⚠️ Failed to delete Google Calendar event:', deleteResult.error);
            }
          }
        }
      } catch (googleError) {
        console.warn('⚠️ Failed to delete Google Calendar event (continuing with DB deletion):', googleError.message);
        // Continue with database deletion even if Google Calendar deletion fails
      }
    }

    // Delete meeting from database
    await Meeting.findByIdAndDelete(id);

    // Create notification for mentee
    try {
      await Notification.createNotification({
        userId: menteeId,
        type: 'meeting_cancelled',
        title: 'Meeting Deleted',
        message: `The meeting "${meetingTitle}" has been deleted by your mentor.`,
        data: {
          meetingId: id,
          bookingId: meeting.bookingId
        },
        priority: 'high',
        actionUrl: '/mentees/meetings',
        actionText: 'View Meetings'
      });
    } catch (notificationError) {
      console.warn('⚠️ Failed to create notification (meeting still deleted):', notificationError.message);
    }

    return sendSuccessResponse(res, 'Meeting deleted successfully');
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return sendErrorResponse(res, 'Failed to delete meeting', 500);
  }
};

// Get meetings by date range for calendar
const getMeetingsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const mentorId = req.user.id;

    if (!startDate || !endDate) {
      return sendErrorResponse(res, 'Start date and end date are required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return sendErrorResponse(res, 'Invalid date format', 400);
    }

    // Get only scheduled and in-progress meetings (upcoming/scheduled)
    const query = {
      mentorId,
      isActive: true,
      status: { $in: ['scheduled', 'in-progress'] },
      scheduledDate: {
        $gte: start,
        $lte: end
      }
    };

    const meetings = await Meeting.find(query)
      .populate('menteeId', 'profile firstName lastName email')
      .select('scheduledDate title status meetingLink duration menteeId')
      .sort({ scheduledDate: 1 });

    // Group meetings by date for easier calendar rendering
    const meetingsByDate = {};
    meetings.forEach(meeting => {
      const dateKey = meeting.scheduledDate.toISOString().split('T')[0];
      if (!meetingsByDate[dateKey]) {
        meetingsByDate[dateKey] = [];
      }
      meetingsByDate[dateKey].push(meeting);
    });

    return sendSuccessResponse(res, 'Meetings retrieved successfully', {
      meetings,
      meetingsByDate
    });
  } catch (error) {
    console.error('Error getting meetings by date range:', error);
    return sendErrorResponse(res, 'Failed to retrieve meetings', 500);
  }
};

// Get meetings for a specific date
const getMeetingsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const mentorId = req.user.id;

    if (!date) {
      return sendErrorResponse(res, 'Date is required', 400);
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return sendErrorResponse(res, 'Invalid date format', 400);
    }

    // Set time to start and end of day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get only scheduled and in-progress meetings
    const query = {
      mentorId,
      isActive: true,
      status: { $in: ['scheduled', 'in-progress'] },
      scheduledDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    };

    const meetings = await Meeting.find(query)
      .populate('menteeId', 'profile firstName lastName email')
      .populate('bookingId', 'serviceId totalAmount')
      .sort({ scheduledDate: 1 });

    return sendSuccessResponse(res, 'Meetings retrieved successfully', { meetings });
  } catch (error) {
    console.error('Error getting meetings by date:', error);
    return sendErrorResponse(res, 'Failed to retrieve meetings', 500);
  }
};

// Get mentees for mentor (for dropdown selection)
const getMentorMentees = async (req, res) => {
  try {
    // Fetch all active mentees from the system
    const User = require('../../shared/models/User');
    const mentees = await User.find({
      role: 'mentee',
      isActive: true
    })
      .select('profile email')
      .sort({ 'profile.firstName': 1, 'profile.lastName': 1, email: 1 });

    return sendSuccessResponse(res, 'Mentees retrieved successfully', { mentees });
  } catch (error) {
    console.error('Error getting mentor mentees:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentees', 500);
  }
};

module.exports = {
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
};
