const Meeting = require('../../shared/models/Meeting');
const Booking = require('../../shared/models/Booking');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

// Get all sessions (meetings)
const getAllSessions = async (req, res) => {
  try {
    const { status = 'all' } = req.query;

    // Build query
    const query = { isActive: true };
    if (status !== 'all') {
      query.status = status;
    }

    // Fetch meetings with mentor and mentee population
    const meetings = await Meeting.find(query)
      .populate('mentorId', 'firstName lastName email')
      .populate('menteeId', 'firstName lastName email')
      .sort({ scheduledDate: -1 });

    // Format response
    const formattedSessions = meetings.map(meeting => {
      const mentorName = meeting.mentorId && meeting.mentorId.firstName && meeting.mentorId.lastName
        ? `${meeting.mentorId.firstName} ${meeting.mentorId.lastName}`.trim()
        : meeting.mentorId && meeting.mentorId.firstName
        ? meeting.mentorId.firstName
        : meeting.mentorId && meeting.mentorId.email
        ? meeting.mentorId.email
        : 'Unknown Mentor';

      const menteeName = meeting.menteeId && meeting.menteeId.firstName && meeting.menteeId.lastName
        ? `${meeting.menteeId.firstName} ${meeting.menteeId.lastName}`.trim()
        : meeting.menteeId && meeting.menteeId.firstName
        ? meeting.menteeId.firstName
        : meeting.menteeId && meeting.menteeId.email
        ? meeting.menteeId.email
        : 'Unknown Mentee';

      return {
        id: meeting._id.toString(),
        mentor: mentorName,
        mentee: menteeName,
        topic: meeting.title,
        datetime: new Date(meeting.scheduledDate).toLocaleString(),
        status: meeting.status
      };
    });

    return sendSuccessResponse(res, 'Sessions retrieved successfully', {
      sessions: formattedSessions,
      total: formattedSessions.length
    });
  } catch (error) {
    console.error('Error getting sessions:', error);
    return sendErrorResponse(res, 'Failed to retrieve sessions', 500);
  }
};

// Get session details by ID (including booking if available)
const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch meeting with all related data
    const meeting = await Meeting.findById(id)
      .populate('mentorId', 'firstName lastName email profile')
      .populate('menteeId', 'firstName lastName email profile')
      .populate('bookingId');

    if (!meeting) {
      return sendErrorResponse(res, 'Session not found', 404);
    }

    // Fetch booking if bookingId exists
    let booking = null;
    if (meeting.bookingId) {
      booking = await Booking.findById(meeting.bookingId)
        .populate('serviceId', 'title category packages')
        .populate('mentorId', 'firstName lastName email')
        .populate('menteeId', 'firstName lastName email');
    }

    // Format meeting data
    const mentorName = meeting.mentorId && meeting.mentorId.firstName && meeting.mentorId.lastName
      ? `${meeting.mentorId.firstName} ${meeting.mentorId.lastName}`.trim()
      : meeting.mentorId && meeting.mentorId.firstName
      ? meeting.mentorId.firstName
      : meeting.mentorId && meeting.mentorId.email
      ? meeting.mentorId.email
      : 'Unknown Mentor';

    const menteeName = meeting.menteeId && meeting.menteeId.firstName && meeting.menteeId.lastName
      ? `${meeting.menteeId.firstName} ${meeting.menteeId.lastName}`.trim()
      : meeting.menteeId && meeting.menteeId.firstName
      ? meeting.menteeId.firstName
      : meeting.menteeId && meeting.menteeId.email
      ? meeting.menteeId.email
      : 'Unknown Mentee';

    const meetingData = {
      id: meeting._id.toString(),
      title: meeting.title,
      description: meeting.description || '',
      meetingLink: meeting.meetingLink,
      meetingId: meeting.meetingId,
      googleEventId: meeting.googleEventId,
      googleCalendarLink: meeting.googleCalendarLink,
      scheduledDate: meeting.scheduledDate,
      duration: meeting.duration,
      status: meeting.status,
      meetingType: meeting.meetingType,
      meetingPassword: meeting.meetingPassword,
      startedAt: meeting.startedAt,
      endedAt: meeting.endedAt,
      notes: meeting.notes || '',
      recordingUrl: meeting.recordingUrl,
      mentor: {
        id: meeting.mentorId?._id?.toString() || null,
        name: mentorName,
        email: meeting.mentorId?.email || 'N/A'
      },
      mentee: {
        id: meeting.menteeId?._id?.toString() || null,
        name: menteeName,
        email: meeting.menteeId?.email || 'N/A'
      },
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt
    };

    // Format booking data if exists
    let bookingData = null;
    if (booking) {
      bookingData = {
        id: booking._id.toString(),
        status: booking.status,
        scheduledDate: booking.scheduledDate,
        duration: booking.duration,
        totalAmount: booking.totalAmount,
        paymentStatus: booking.paymentStatus,
        paymentId: booking.paymentId,
        notes: booking.notes || '',
        menteeNotes: booking.menteeNotes || '',
        mentorNotes: booking.mentorNotes || '',
        service: booking.serviceId ? {
          id: booking.serviceId._id.toString(),
          title: booking.serviceId.title,
          category: booking.serviceId.category
        } : null,
        completedAt: booking.completedAt,
        cancelledAt: booking.cancelledAt,
        cancellationReason: booking.cancellationReason,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt
      };
    }

    return sendSuccessResponse(res, 'Session details retrieved successfully', {
      meeting: meetingData,
      booking: bookingData
    });
  } catch (error) {
    console.error('Error getting session details:', error);
    return sendErrorResponse(res, 'Failed to retrieve session details', 500);
  }
};

module.exports = {
  getAllSessions,
  getSessionById
};

