const ServiceFeedback = require('../../shared/models/ServiceFeedback');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

// Get feedbacks for a mentor (mentor panel)
const getMentorFeedbacks = async (req, res) => {
  try {
    const mentorId = req.user.id; // Get mentor ID from authenticated user
    const { page = 1, limit = 50 } = req.query;

    // Get feedbacks
    const feedbacks = await ServiceFeedback.getByMentor(mentorId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Get total count
    const total = await ServiceFeedback.countDocuments({ 
      mentorId, 
      isActive: true 
    });

    return sendSuccessResponse(res, 'Feedbacks retrieved successfully', {
      feedbacks,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting mentor feedbacks:', error);
    return sendErrorResponse(res, 'Failed to retrieve feedbacks', 500);
  }
};

module.exports = {
  getMentorFeedbacks
};

