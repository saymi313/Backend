const ServiceFeedback = require('../../shared/models/ServiceFeedback');
const MentorService = require('../../MentorPanel/models/Service');
const User = require('../../shared/models/User');
const ContactMessage = require('../../shared/models/ContactMessage');
const Notification = require('../../shared/models/Notification');
const emailService = require('../../shared/services/emailService');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

// Get all feedbacks with filtering
const getAllFeedbacks = async (req, res) => {
  try {
    const { page = 1, limit = 20, minRating, isVisible } = req.query;

    // Build query
    const query = { isActive: true };

    if (minRating) {
      query.rating = { $gte: parseInt(minRating) };
    }

    if (isVisible !== undefined) {
      query.isVisible = isVisible === 'true';
    }

    // Get feedbacks with pagination
    const feedbacks = await ServiceFeedback.find(query)
      .populate('serviceId', 'title category')
      .populate('mentorId', 'email profile.firstName profile.lastName')
      .populate('menteeId', 'email profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await ServiceFeedback.countDocuments(query);

    // Format feedbacks for response
    const formattedFeedbacks = feedbacks.map(feedback => ({
      id: feedback._id.toString(),
      service: feedback.serviceId?.title || 'N/A',
      mentor: feedback.mentorId
        ? `${feedback.mentorId.profile?.firstName || ''} ${feedback.mentorId.profile?.lastName || ''}`.trim() || feedback.mentorId.email
        : 'N/A',
      mentee: feedback.menteeId
        ? `${feedback.menteeId.profile?.firstName || ''} ${feedback.menteeId.profile?.lastName || ''}`.trim() || feedback.menteeId.email
        : 'N/A',
      rating: feedback.rating,
      review: feedback.comment,
      status: feedback.isVisible ? 'visible' : 'hidden',
      isVisible: feedback.isVisible,
      adminResponse: feedback.adminResponse || null,
      createdAt: feedback.createdAt
    }));

    return sendSuccessResponse(res, 'Feedbacks retrieved successfully', {
      feedbacks: formattedFeedbacks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting feedbacks:', error);
    return sendErrorResponse(res, 'Failed to retrieve feedbacks', 500);
  }
};

// Update feedback visibility
const updateFeedbackVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVisible } = req.body;

    if (typeof isVisible !== 'boolean') {
      return sendErrorResponse(res, 'isVisible must be a boolean', 400);
    }

    const feedback = await ServiceFeedback.findById(id);
    if (!feedback) {
      return sendErrorResponse(res, 'Feedback not found', 404);
    }

    feedback.isVisible = isVisible;
    await feedback.save();

    return sendSuccessResponse(res, `Feedback ${isVisible ? 'shown' : 'hidden'} successfully`, {
      feedback: {
        id: feedback._id.toString(),
        isVisible: feedback.isVisible
      }
    });
  } catch (error) {
    console.error('Error updating feedback visibility:', error);
    return sendErrorResponse(res, 'Failed to update feedback visibility', 500);
  }
};

// Delete feedback (soft delete)
const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const feedback = await ServiceFeedback.findById(id);
    if (!feedback) {
      return sendErrorResponse(res, 'Feedback not found', 404);
    }

    feedback.isActive = false;
    await feedback.save();

    // Recalculate service rating
    if (feedback.serviceId) {
      const ratingData = await ServiceFeedback.calculateAverageRating(feedback.serviceId);
      const service = await MentorService.findById(feedback.serviceId);
      if (service) {
        service.rating = ratingData.rating;
        service.totalReviews = ratingData.totalReviews;
        await service.save();
      }
    }

    return sendSuccessResponse(res, 'Feedback deleted successfully');
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return sendErrorResponse(res, 'Failed to delete feedback', 500);
  }
};

// Update admin response
const updateFeedbackResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (response && response.length > 500) {
      return sendErrorResponse(res, 'Admin response cannot exceed 500 characters', 400);
    }

    const feedback = await ServiceFeedback.findById(id);
    if (!feedback) {
      return sendErrorResponse(res, 'Feedback not found', 404);
    }

    feedback.adminResponse = response ? response.trim() : null;
    await feedback.save();

    return sendSuccessResponse(res, 'Admin response updated successfully', {
      feedback: {
        id: feedback._id.toString(),
        adminResponse: feedback.adminResponse
      }
    });
  } catch (error) {
    console.error('Error updating admin response:', error);
    return sendErrorResponse(res, 'Failed to update admin response', 500);
  }
};

// Get all contact messages
const getContactMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    // Build query
    const query = { isActive: true };

    if (status) {
      query.status = status;
    }

    // Get contact messages with pagination
    const contactMessages = await ContactMessage.find(query)
      .populate('userId', 'email profile.firstName profile.lastName')
      .populate('respondedBy', 'email profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await ContactMessage.countDocuments(query);

    // Format contact messages for response
    const formattedMessages = contactMessages.map(msg => ({
      id: msg._id.toString(),
      name: msg.name,
      email: msg.email,
      phone: msg.phone || '',
      subject: msg.subject,
      message: msg.message,
      status: msg.status,
      adminResponse: msg.adminResponse || null,
      createdAt: msg.createdAt,
      respondedAt: msg.respondedAt || null
    }));

    return sendSuccessResponse(res, 'Contact messages retrieved successfully', {
      contactMessages: formattedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting contact messages:', error);
    return sendErrorResponse(res, 'Failed to retrieve contact messages', 500);
  }
};

// Respond to contact message
const respondToContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    const adminId = req.user.id;

    if (!response || !response.trim()) {
      return sendErrorResponse(res, 'Response is required', 400);
    }

    if (response.length > 2000) {
      return sendErrorResponse(res, 'Response cannot exceed 2000 characters', 400);
    }

    const contactMessage = await ContactMessage.findById(id);
    if (!contactMessage) {
      return sendErrorResponse(res, 'Contact message not found', 404);
    }

    // Update contact message
    contactMessage.adminResponse = response.trim();
    contactMessage.status = 'responded';
    contactMessage.respondedAt = new Date();
    contactMessage.respondedBy = adminId;
    await contactMessage.save();

    // Send notification to user if userId exists, or try to find user by email
    let targetUserId = contactMessage.userId;

    // If no userId but email exists, try to find user by email
    if (!targetUserId && contactMessage.email) {
      try {
        const userByEmail = await User.findOne({
          email: contactMessage.email.toLowerCase().trim(),
          isActive: true
        });
        if (userByEmail) {
          targetUserId = userByEmail._id;
        }
      } catch (findUserError) {
        console.error('Error finding user by email:', findUserError);
      }
    }

    // Send notification if we have a userId
    if (targetUserId) {
      try {
        // Truncate response for notification message if too long
        const responsePreview = response.trim().length > 150
          ? response.trim().substring(0, 150) + '...'
          : response.trim();

        const notificationData = {
          userId: targetUserId,
          type: 'admin_response',
          title: 'Response to Your Contact Message',
          message: `We've responded to your contact message regarding "${contactMessage.subject}":\n\n"${responsePreview}"`,
          data: {
            customData: {
              contactMessageId: contactMessage._id.toString(),
              subject: contactMessage.subject,
              adminResponse: response.trim(),
              fullResponse: response.trim()
            }
          },
          priority: 'high',
          status: 'unread',
          isRead: false,
          deliveryChannels: [{ type: 'in-app', status: 'pending' }],
          actionUrl: '/notifications',
          actionText: 'View Response'
        };

        const notification = await Notification.createNotification(notificationData);

        console.log(`✅ Notification created successfully:`);
        console.log(`   - Notification ID: ${notification._id}`);
        console.log(`   - User ID: ${targetUserId}`);
        console.log(`   - Type: admin_response`);
        console.log(`   - Status: ${notification.status}`);
        console.log(`   - IsRead: ${notification.isRead}`);
        console.log(`   - Contact Message ID: ${contactMessage._id}`);
      } catch (notificationError) {
        console.error('❌ Error creating notification for contact response:', notificationError);
        console.error('   Error details:', notificationError.message);
        console.error('   Stack:', notificationError.stack);
        // Don't fail the request if notification fails
      }
    } else {
      console.log(`⚠️ No user found for contact message ${contactMessage._id} (email: ${contactMessage.email}). Notification not sent.`);
    }

    // Send email response
    if (contactMessage.email) {
      try {
        await emailService.sendContactResponseEmail(
          contactMessage.email,
          contactMessage.name,
          contactMessage.subject,
          response.trim()
        );
      } catch (emailError) {
        console.error('❌ Failed to send contact response email:', emailError);
      }
    }

    return sendSuccessResponse(res, 'Response sent successfully', {
      contactMessage: {
        id: contactMessage._id.toString(),
        status: contactMessage.status,
        adminResponse: contactMessage.adminResponse
      }
    });
  } catch (error) {
    console.error('Error responding to contact message:', error);
    return sendErrorResponse(res, 'Failed to send response', 500);
  }
};

module.exports = {
  getAllFeedbacks,
  updateFeedbackVisibility,
  deleteFeedback,
  updateFeedbackResponse,
  getContactMessages,
  respondToContactMessage
};

