const Booking = require('../../shared/models/Booking');
const Meeting = require('../../shared/models/Meeting');
const Notification = require('../../shared/models/Notification');
const MentorService = require('../../MentorPanel/models/Service');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

// Create new booking
const createBooking = async (req, res) => {
  try {
    const { serviceId, packageId, scheduledDate, duration, notes } = req.body;
    const menteeId = req.user.id;

    // Verify service exists and is approved
    const service = await MentorService.findOne({ _id: serviceId, status: 'approved', isActive: true });
    if (!service) {
      return sendErrorResponse(res, 'Service not found or not available', 404);
    }

    // Find the selected package
    const selectedPackage = service.packages.find(pkg => pkg._id.toString() === packageId);
    if (!selectedPackage) {
      return sendErrorResponse(res, 'Package not found', 404);
    }

    // Create booking
    const booking = new Booking({
      menteeId,
      mentorId: service.mentorId,
      serviceId: service._id,
      packageId,
      scheduledDate: new Date(scheduledDate),
      duration,
      totalAmount: selectedPackage.price,
      notes: notes || '',
      menteeNotes: notes || ''
    });

    await booking.save();

    // Populate booking data for response
    await booking.populate([
      { path: 'menteeId', select: 'profile firstName lastName email' },
      { path: 'mentorId', select: 'profile firstName lastName email' },
      { path: 'serviceId', select: 'title category' }
    ]);

    // Create notification for mentor
    await Notification.createNotification({
      userId: service.mentorId,
      type: 'booking_created',
      title: 'New Booking Received',
      message: `You have received a new booking for ${service.title}.`,
      data: {
        bookingId: booking._id,
        serviceId: service._id
      },
      priority: 'high',
      actionUrl: `/mentors/bookings/${booking._id}`,
      actionText: 'View Booking'
    });

    return sendSuccessResponse(res, 'Booking created successfully', { booking });
  } catch (error) {
    console.error('Error creating booking:', error);
    return sendErrorResponse(res, 'Failed to create booking', 500);
  }
};

// Get all bookings for mentee
const getMenteeBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const menteeId = req.user.id;

    const query = { menteeId, isActive: true };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('mentorId', 'profile firstName lastName email')
      .populate('serviceId', 'title category packages')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    return sendSuccessResponse(res, 'Mentee bookings retrieved successfully', {
      bookings,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error getting mentee bookings:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentee bookings', 500);
  }
};

// Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const menteeId = req.user.id;

    const booking = await Booking.findOne({ _id: id, menteeId, isActive: true })
      .populate('mentorId', 'profile firstName lastName email phone')
      .populate('serviceId', 'title category packages description')
      .populate('menteeId', 'profile firstName lastName email');

    if (!booking) {
      return sendErrorResponse(res, 'Booking not found', 404);
    }

    return sendSuccessResponse(res, 'Booking retrieved successfully', { booking });
  } catch (error) {
    console.error('Error getting booking:', error);
    return sendErrorResponse(res, 'Failed to retrieve booking', 500);
  }
};

// Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const menteeId = req.user.id;

    const booking = await Booking.findOne({ _id: id, menteeId, isActive: true });
    if (!booking) {
      return sendErrorResponse(res, 'Booking not found', 404);
    }

    if (booking.status === 'completed') {
      return sendErrorResponse(res, 'Cannot cancel completed booking', 400);
    }

    await booking.updateStatus('cancelled', reason);

    // Create notification for mentor
    await Notification.createNotification({
      userId: booking.mentorId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: `A booking has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
      data: {
        bookingId: booking._id,
        serviceId: booking.serviceId
      },
      priority: 'medium',
      actionUrl: `/mentors/bookings/${booking._id}`,
      actionText: 'View Booking'
    });

    return sendSuccessResponse(res, 'Booking cancelled successfully', { booking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return sendErrorResponse(res, 'Failed to cancel booking', 500);
  }
};

// Get mentee meetings
const getMenteeMeetings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const menteeId = req.user.id;

    const query = { menteeId, isActive: true };
    if (status) {
      query.status = status;
    }

    const meetings = await Meeting.find(query)
      .populate('mentorId', 'profile firstName lastName email')
      .populate('bookingId', 'serviceId totalAmount')
      .sort({ scheduledDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Meeting.countDocuments(query);

    return sendSuccessResponse(res, 'Mentee meetings retrieved successfully', {
      meetings,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error getting mentee meetings:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentee meetings', 500);
  }
};

// Get meeting by ID
const getMeetingById = async (req, res) => {
  try {
    const { id } = req.params;
    const menteeId = req.user.id;

    const meeting = await Meeting.findOne({ _id: id, menteeId, isActive: true })
      .populate('mentorId', 'profile firstName lastName email phone')
      .populate('bookingId', 'serviceId totalAmount')
      .populate('menteeId', 'profile firstName lastName email');

    if (!meeting) {
      return sendErrorResponse(res, 'Meeting not found', 404);
    }

    return sendSuccessResponse(res, 'Meeting retrieved successfully', { meeting });
  } catch (error) {
    console.error('Error getting meeting:', error);
    return sendErrorResponse(res, 'Failed to retrieve meeting', 500);
  }
};

// Join meeting
const joinMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const menteeId = req.user.id;

    const meeting = await Meeting.findOne({ _id: id, menteeId, isActive: true });
    if (!meeting) {
      return sendErrorResponse(res, 'Meeting not found', 404);
    }

    // Update participant status
    const participant = meeting.participants.find(p => p.userId.toString() === menteeId);
    if (participant) {
      participant.joinedAt = new Date();
      participant.isPresent = true;
      await meeting.save();
    }

    return sendSuccessResponse(res, 'Meeting joined successfully', { 
      meeting,
      meetingLink: meeting.meetingLink,
      meetingPassword: meeting.meetingPassword
    });
  } catch (error) {
    console.error('Error joining meeting:', error);
    return sendErrorResponse(res, 'Failed to join meeting', 500);
  }
};

// Get today's meetings
const getTodaysMeetings = async (req, res) => {
  try {
    const menteeId = req.user.id;
    const meetings = await Meeting.getTodaysMeetings(menteeId, 'mentee');

    return sendSuccessResponse(res, 'Today\'s meetings retrieved successfully', { meetings });
  } catch (error) {
    console.error('Error getting today\'s meetings:', error);
    return sendErrorResponse(res, 'Failed to retrieve today\'s meetings', 500);
  }
};

// Get upcoming meetings
const getUpcomingMeetings = async (req, res) => {
  try {
    const menteeId = req.user.id;
    const meetings = await Meeting.getUpcoming(menteeId, 'mentee');

    return sendSuccessResponse(res, 'Upcoming meetings retrieved successfully', { meetings });
  } catch (error) {
    console.error('Error getting upcoming meetings:', error);
    return sendErrorResponse(res, 'Failed to retrieve upcoming meetings', 500);
  }
};

// Leave feedback for meeting
const leaveMeetingFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback, rating } = req.body;
    const menteeId = req.user.id;

    const meeting = await Meeting.findOne({ _id: id, menteeId, isActive: true });
    if (!meeting) {
      return sendErrorResponse(res, 'Meeting not found', 404);
    }

    if (meeting.status !== 'completed') {
      return sendErrorResponse(res, 'Can only leave feedback for completed meetings', 400);
    }

    meeting.feedback.menteeFeedback = feedback;
    if (rating) {
      meeting.feedback.rating = rating;
    }
    await meeting.save();

    // Create notification for mentor
    await Notification.createNotification({
      userId: meeting.mentorId,
      type: 'review_received',
      title: 'Meeting Feedback Received',
      message: 'You have received feedback for your meeting.',
      data: {
        meetingId: meeting._id,
        bookingId: meeting.bookingId
      },
      priority: 'medium',
      actionUrl: `/mentors/meetings/${meeting._id}`,
      actionText: 'View Feedback'
    });

    return sendSuccessResponse(res, 'Feedback submitted successfully', { meeting });
  } catch (error) {
    console.error('Error leaving meeting feedback:', error);
    return sendErrorResponse(res, 'Failed to submit feedback', 500);
  }
};

module.exports = {
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
};
