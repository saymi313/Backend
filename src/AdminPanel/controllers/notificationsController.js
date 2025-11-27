const User = require('../../shared/models/User');
const Notification = require('../../shared/models/Notification');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');
const { USER_ROLES } = require('../../shared/utils/constants/roles');

// Send notification to users
const sendNotification = async (req, res) => {
  try {
    const { segment, channel, subject, message } = req.body;

    // Validate required fields
    if (!segment || !channel || !subject || !message) {
      return sendErrorResponse(res, 'Segment, channel, subject, and message are required', 400);
    }

    // Validate segment
    const validSegments = ['All Mentors', 'All Mentees', 'All Users'];
    if (!validSegments.includes(segment)) {
      return sendErrorResponse(res, 'Invalid segment. Must be one of: All Mentors, All Mentees, All Users', 400);
    }

    // Validate channel
    const validChannels = ['In-App', 'Email'];
    if (!validChannels.includes(channel)) {
      return sendErrorResponse(res, 'Invalid channel. Must be one of: In-App, Email', 400);
    }

    // Query users based on segment
    let targetUsers = [];
    if (segment === 'All Mentors') {
      targetUsers = await User.find({ role: USER_ROLES.MENTOR, isActive: true });
    } else if (segment === 'All Mentees') {
      targetUsers = await User.find({ role: USER_ROLES.MENTEE, isActive: true });
    } else if (segment === 'All Users') {
      targetUsers = await User.find({ isActive: true });
    }

    if (targetUsers.length === 0) {
      return sendErrorResponse(res, 'No active users found for the selected segment', 404);
    }

    // Prepare notification data
    const userIds = targetUsers.map(u => u._id);
    const notificationData = {
      type: 'admin_announcement',
      title: subject.trim(),
      message: message.trim(),
      priority: 'high',
      deliveryChannels: channel === 'Email' 
        ? [{ type: 'email', status: 'pending' }] 
        : [{ type: 'in-app', status: 'pending' }],
      actionUrl: '/notifications',
      actionText: 'View Details'
    };

    // Create bulk notifications
    const notifications = await Notification.sendBulk(userIds, notificationData);

    return sendSuccessResponse(res, `Notification sent successfully to ${notifications.length} users`, {
      count: notifications.length,
      segment,
      channel
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return sendErrorResponse(res, 'Failed to send notification', 500);
  }
};

// Get notification history
const getNotificationHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Get all admin announcements, sorted by creation date
    const notifications = await Notification.find({
      type: 'admin_announcement',
      isActive: true
    })
      .populate('userId', 'email profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await Notification.countDocuments({
      type: 'admin_announcement',
      isActive: true
    });

    // Group by title and message to show unique notifications sent
    const groupedNotifications = {};
    notifications.forEach(notif => {
      const key = `${notif.title}|${notif.message}`;
      if (!groupedNotifications[key]) {
        groupedNotifications[key] = {
          id: notif._id,
          title: notif.title,
          message: notif.message,
          sentAt: notif.createdAt,
          count: 0,
          channels: notif.deliveryChannels.map(ch => ch.type)
        };
      }
      groupedNotifications[key].count++;
    });

    const history = Object.values(groupedNotifications);

    return sendSuccessResponse(res, 'Notification history retrieved successfully', {
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting notification history:', error);
    return sendErrorResponse(res, 'Failed to retrieve notification history', 500);
  }
};

module.exports = {
  sendNotification,
  getNotificationHistory
};

