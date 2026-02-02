const User = require('../../shared/models/User');
const MentorService = require('../../MentorPanel/models/Service');
const ServiceFeedback = require('../../shared/models/ServiceFeedback');
const Notification = require('../../shared/models/Notification');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');
const { USER_ROLES } = require('../../shared/utils/constants/roles');

// Get all mentors
const getAllMentors = async (req, res) => {
  try {
    const { status = 'all', search = '' } = req.query;

    // Build query
    const query = { role: USER_ROLES.MENTOR, isActive: true };

    // Handle status filter (null means approved for existing mentors)
    if (status !== 'all') {
      if (status === 'approved') {
        query.$or = [
          { mentorApprovalStatus: 'approved' },
          { mentorApprovalStatus: null } // Existing mentors with null are considered approved
        ];
      } else {
        query.mentorApprovalStatus = status;
      }
    }

    // Add search filter
    if (search) {
      const searchConditions = [
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.country': { $regex: search, $options: 'i' } }
      ];

      if (query.$or) {
        // Combine status filter with search
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Fetch mentors
    const mentors = await User.find(query)
      .select('email profile mentorApprovalStatus isLoginPaused createdAt')
      .sort({ createdAt: -1 });

    // Calculate ratings for each mentor
    const mentorsWithRatings = await Promise.all(
      mentors.map(async (mentor) => {
        // Get average rating from services
        const services = await MentorService.find({ mentorId: mentor._id, isActive: true });
        const totalRating = services.reduce((sum, service) => sum + (service.rating || 0), 0);
        const avgRating = services.length > 0 ? (totalRating / services.length).toFixed(1) : '0.0';

        // Determine verification status (simplified - can be enhanced)
        const verify = mentor.isVerified ? 'Verified' : 'KYC Pending';

        // Determine status for display
        let displayStatus = mentor.mentorApprovalStatus;
        if (displayStatus === null) {
          displayStatus = 'approved'; // Existing mentors
        }

        return {
          id: mentor._id.toString(),
          name: `${mentor.profile.firstName} ${mentor.profile.lastName}`,
          email: mentor.email,
          country: mentor.profile.country || 'N/A',
          verify: verify,
          rating: avgRating,
          status: displayStatus,
          paused: mentor.isLoginPaused || false,
          createdAt: new Date(mentor.createdAt).toLocaleDateString()
        };
      })
    );

    return sendSuccessResponse(res, 'Mentors retrieved successfully', {
      mentors: mentorsWithRatings,
      total: mentorsWithRatings.length
    });
  } catch (error) {
    console.error('Error getting mentors:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentors', 500);
  }
};

// Get mentor by ID
const getMentorById = async (req, res) => {
  try {
    const { id } = req.params;

    const mentor = await User.findOne({ _id: id, role: USER_ROLES.MENTOR });
    if (!mentor) {
      return sendErrorResponse(res, 'Mentor not found', 404);
    }

    // Get mentor services and calculate rating
    const services = await MentorService.find({ mentorId: mentor._id, isActive: true });
    const totalRating = services.reduce((sum, service) => sum + (service.rating || 0), 0);
    const avgRating = services.length > 0 ? (totalRating / services.length).toFixed(1) : '0.0';

    const mentorData = {
      id: mentor._id.toString(),
      name: `${mentor.profile.firstName} ${mentor.profile.lastName}`,
      email: mentor.email,
      country: mentor.profile.country || 'N/A',
      phone: mentor.profile.phone || 'N/A',
      verify: mentor.isVerified ? 'Verified' : 'KYC Pending',
      rating: avgRating,
      status: mentor.mentorApprovalStatus === null ? 'approved' : mentor.mentorApprovalStatus,
      paused: mentor.isLoginPaused || false,
      createdAt: mentor.createdAt,
      servicesCount: services.length
    };

    return sendSuccessResponse(res, 'Mentor retrieved successfully', { mentor: mentorData });
  } catch (error) {
    console.error('Error getting mentor:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentor', 500);
  }
};

// Update mentor approval status
const updateMentorApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return sendErrorResponse(res, 'Invalid status. Must be "approved" or "rejected"', 400);
    }

    const mentor = await User.findOne({ _id: id, role: USER_ROLES.MENTOR });
    if (!mentor) {
      return sendErrorResponse(res, 'Mentor not found', 404);
    }

    // Update approval status
    mentor.mentorApprovalStatus = status;
    await mentor.save();

    // Send notification to mentor
    try {
      let notificationMessage = '';
      if (status === 'approved') {
        notificationMessage = 'Congratulations! Your mentor account has been approved. You can now log in and start offering your services.';
      } else {
        notificationMessage = reason
          ? `Your mentor account has been rejected. Reason: ${reason}`
          : 'Your mentor account has been rejected. Please contact support for more information.';
      }

      await Notification.createNotification({
        userId: mentor._id,
        type: status === 'approved' ? 'mentor_approved' : 'mentor_rejected',
        title: status === 'approved' ? 'Account Approved' : 'Account Rejected',
        message: notificationMessage,
        priority: 'high',
        deliveryChannels: [{ type: 'in-app', status: 'pending' }],
        actionUrl: status === 'approved' ? '/mentors/login' : '/contact',
        actionText: status === 'approved' ? 'Login Now' : 'Contact Support'
      });

      // Send approval email to mentor if approved
      if (status === 'approved') {
        try {
          const emailService = require('../../shared/services/emailService');
          const mentorName = `${mentor.profile.firstName} ${mentor.profile.lastName}`;

          await emailService.sendMentorApprovedEmail(
            mentor.email,
            mentorName
          );
          console.log('✅ Mentor approval email sent');
        } catch (emailError) {
          console.error('⚠️ Failed to send mentor approval email (continuing):', emailError.message);
          // Don't fail the request if email fails
        }
      }
    } catch (notificationError) {
      console.error('Error sending notification to mentor:', notificationError);
      // Don't fail the request if notification fails
    }

    return sendSuccessResponse(res, `Mentor ${status} successfully`, {
      mentor: {
        id: mentor._id.toString(),
        status: mentor.mentorApprovalStatus
      }
    });
  } catch (error) {
    console.error('Error updating mentor approval status:', error);
    return sendErrorResponse(res, 'Failed to update mentor approval status', 500);
  }
};

// Toggle mentor login pause
const toggleMentorLoginPause = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPaused } = req.body;

    if (typeof isPaused !== 'boolean') {
      return sendErrorResponse(res, 'isPaused must be a boolean value', 400);
    }

    const mentor = await User.findOne({ _id: id, role: USER_ROLES.MENTOR });
    if (!mentor) {
      return sendErrorResponse(res, 'Mentor not found', 404);
    }

    console.log(`🔄 Toggling mentor login pause for: ${mentor.email} (ID: ${mentor._id})`);
    console.log(`   - Current isLoginPaused: ${mentor.isLoginPaused}`);
    console.log(`   - New isLoginPaused: ${isPaused}`);

    // Update pause status
    mentor.isLoginPaused = isPaused;
    await mentor.save();

    // Verify the save
    const updatedMentor = await User.findById(mentor._id);
    console.log(`   - Verified isLoginPaused after save: ${updatedMentor.isLoginPaused}`);

    // Send notification to mentor
    try {
      await Notification.createNotification({
        userId: mentor._id,
        type: 'mentor_login_paused',
        title: isPaused ? 'Login Access Paused' : 'Login Access Restored',
        message: isPaused
          ? 'Your login access has been paused by admin. Please contact support for more information.'
          : 'Your login access has been restored. You can now log in to your account.',
        priority: 'high',
        deliveryChannels: [{ type: 'in-app', status: 'pending' }],
        actionUrl: '/contact',
        actionText: 'Contact Support'
      });
    } catch (notificationError) {
      console.error('Error sending notification to mentor:', notificationError);
      // Don't fail the request if notification fails
    }

    return sendSuccessResponse(res, `Mentor login ${isPaused ? 'paused' : 'unpaused'} successfully`, {
      mentor: {
        id: mentor._id.toString(),
        isLoginPaused: mentor.isLoginPaused
      }
    });
  } catch (error) {
    console.error('Error toggling mentor login pause:', error);
    return sendErrorResponse(res, 'Failed to toggle mentor login pause', 500);
  }
};

// Get mentors by status for chart
const getMentorsByStatus = async (req, res) => {
  try {
    const statusData = await User.aggregate([
      {
        $match: {
          role: USER_ROLES.MENTOR,
          isActive: true
        }
      },
      {
        $project: {
          status: {
            $cond: [
              { $eq: ['$mentorApprovalStatus', null] },
              'approved',
              '$mentorApprovalStatus'
            ]
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          name: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 'approved'] }, then: 'Approved' },
                { case: { $eq: ['$_id', 'pending'] }, then: 'Pending' },
                { case: { $eq: ['$_id', 'rejected'] }, then: 'Rejected' }
              ],
              default: 'Unknown'
            }
          },
          value: '$count',
          _id: 0
        }
      },
      {
        $sort: { name: 1 }
      }
    ]);

    return sendSuccessResponse(res, 'Mentors by status retrieved successfully', {
      data: statusData
    });
  } catch (error) {
    console.error('Error getting mentors by status:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentors by status', 500);
  }
};

module.exports = {
  getAllMentors,
  getMentorById,
  updateMentorApprovalStatus,
  toggleMentorLoginPause,
  getMentorsByStatus
};

