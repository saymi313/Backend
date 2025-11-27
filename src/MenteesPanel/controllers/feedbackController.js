const ServiceFeedback = require('../../shared/models/ServiceFeedback');
// Import MentorService to ensure it's registered before ServiceFeedback tries to populate
const MentorService = require('../../MentorPanel/models/Service');
const Settings = require('../../shared/models/Settings');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

// Create service feedback
const createServiceFeedback = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { rating, comment } = req.body;
    const menteeId = req.user.id;

    // Validate required fields
    if (!rating || !comment) {
      return sendErrorResponse(res, 'Rating and comment are required', 400);
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return sendErrorResponse(res, 'Rating must be between 1 and 5', 400);
    }

    // Validate comment length
    if (comment.trim().length === 0) {
      return sendErrorResponse(res, 'Comment cannot be empty', 400);
    }

    if (comment.length > 1000) {
      return sendErrorResponse(res, 'Comment cannot exceed 1000 characters', 400);
    }

    // Get service to validate it exists and get mentorId
    const service = await MentorService.findOne({ 
      _id: serviceId, 
      status: 'approved', 
      isActive: true 
    });

    if (!service) {
      return sendErrorResponse(res, 'Service not found', 404);
    }

    const mentorId = service.mentorId;

    // Check if mentee has already left feedback for this service
    const existingFeedback = await ServiceFeedback.hasFeedback(serviceId, menteeId);
    if (existingFeedback) {
      return sendErrorResponse(res, 'You have already left feedback for this service. Only one feedback per service is allowed.', 400);
    }

    // Check auto-approve feedbacks setting
    const settings = await Settings.getSettings();
    const autoApproveFeedbacks = settings.featureFlags?.autoApproveFeedbacks ?? false;

    // Create feedback with visibility based on auto-approve setting
    const feedback = new ServiceFeedback({
      serviceId,
      mentorId,
      menteeId,
      rating: parseInt(rating),
      comment: comment.trim(),
      isVisible: autoApproveFeedbacks // Auto-approve if setting is enabled
    });

    await feedback.save();

    // Recalculate service rating
    const ratingData = await ServiceFeedback.calculateAverageRating(serviceId);
    service.rating = ratingData.rating;
    service.totalReviews = ratingData.totalReviews;
    await service.save();

    // Populate feedback with mentee data for response
    const populatedFeedback = await ServiceFeedback.findById(feedback._id)
      .populate('menteeId', 'profile.firstName profile.lastName profile.avatar email');

    return sendSuccessResponse(res, 'Feedback created successfully', { feedback: populatedFeedback });
  } catch (error) {
    console.error('Error creating service feedback:', error);
    
    // Handle duplicate key error (unique index violation)
    if (error.code === 11000) {
      return sendErrorResponse(res, 'You have already left feedback for this service. Only one feedback per service is allowed.', 400);
    }
    
    return sendErrorResponse(res, 'Failed to create feedback', 500);
  }
};

// Get feedbacks for a service
const getServiceFeedbacks = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate service exists
    const service = await MentorService.findOne({ 
      _id: serviceId, 
      status: 'approved', 
      isActive: true 
    });

    if (!service) {
      return sendErrorResponse(res, 'Service not found', 404);
    }

    // Get feedbacks
    const feedbacks = await ServiceFeedback.getByService(serviceId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Get total count
    const total = await ServiceFeedback.countDocuments({ 
      serviceId, 
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
    console.error('Error getting service feedbacks:', error);
    return sendErrorResponse(res, 'Failed to retrieve feedbacks', 500);
  }
};

// Get feedbacks for a mentor
const getMentorFeedbacks = async (req, res) => {
  try {
    const { mentorId } = req.params;
    const { page = 1, limit = 10 } = req.query;

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

// Update service feedback (optional - for future use)
const updateServiceFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const menteeId = req.user.id;

    const feedback = await ServiceFeedback.findOne({ _id: id, menteeId, isActive: true });
    if (!feedback) {
      return sendErrorResponse(res, 'Feedback not found', 404);
    }

    // Validate rating if provided
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return sendErrorResponse(res, 'Rating must be between 1 and 5', 400);
      }
      feedback.rating = parseInt(rating);
    }

    // Validate comment if provided
    if (comment !== undefined) {
      if (comment.trim().length === 0) {
        return sendErrorResponse(res, 'Comment cannot be empty', 400);
      }
      if (comment.length > 1000) {
        return sendErrorResponse(res, 'Comment cannot exceed 1000 characters', 400);
      }
      feedback.comment = comment.trim();
    }

    await feedback.save();

    // Recalculate service rating
    const ratingData = await ServiceFeedback.calculateAverageRating(feedback.serviceId);
    const service = await MentorService.findById(feedback.serviceId);
    if (service) {
      service.rating = ratingData.rating;
      service.totalReviews = ratingData.totalReviews;
      await service.save();
    }

    // Populate feedback with mentee data for response
    const populatedFeedback = await ServiceFeedback.findById(feedback._id)
      .populate('menteeId', 'profile.firstName profile.lastName profile.avatar email');

    return sendSuccessResponse(res, 'Feedback updated successfully', { feedback: populatedFeedback });
  } catch (error) {
    console.error('Error updating service feedback:', error);
    return sendErrorResponse(res, 'Failed to update feedback', 500);
  }
};

// Delete service feedback (optional - for future use)
const deleteServiceFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const menteeId = req.user.id;

    const feedback = await ServiceFeedback.findOne({ _id: id, menteeId, isActive: true });
    if (!feedback) {
      return sendErrorResponse(res, 'Feedback not found', 404);
    }

    const serviceId = feedback.serviceId;

    // Soft delete
    feedback.isActive = false;
    await feedback.save();

    // Recalculate service rating
    const ratingData = await ServiceFeedback.calculateAverageRating(serviceId);
    const service = await MentorService.findById(serviceId);
    if (service) {
      service.rating = ratingData.rating;
      service.totalReviews = ratingData.totalReviews;
      await service.save();
    }

    return sendSuccessResponse(res, 'Feedback deleted successfully');
  } catch (error) {
    console.error('Error deleting service feedback:', error);
    return sendErrorResponse(res, 'Failed to delete feedback', 500);
  }
};

module.exports = {
  createServiceFeedback,
  getServiceFeedbacks,
  getMentorFeedbacks,
  updateServiceFeedback,
  deleteServiceFeedback
};

