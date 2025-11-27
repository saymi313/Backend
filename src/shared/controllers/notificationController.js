const Notification = require('../models/Notification');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/helpers/responseHelpers');

// Get notifications for user
const getNotifications = async (req, res) => {
  try {
    const { status = 'all', type, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    const options = {
      status,
      type,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      includeExpired: false
    };

    const notifications = await Notification.getByUser(userId, options);
    const unreadCount = await Notification.getUnreadCount(userId);

    // Log for debugging
    console.log(`📬 Fetching notifications for user ${userId}:`);
    console.log(`   - Status filter: ${status}`);
    console.log(`   - Type filter: ${type || 'all'}`);
    console.log(`   - Found ${notifications.length} notifications`);
    if (notifications.length > 0) {
      console.log(`   - Types: ${notifications.map(n => n.type).join(', ')}`);
    }

    return sendSuccessResponse(res, 'Notifications retrieved successfully', {
      notifications,
      unreadCount,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    return sendErrorResponse(res, 'Failed to retrieve notifications', 500);
  }
};

// Mark notifications as read
const markAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user.id;

    await Notification.markAsRead(userId, notificationIds);

    return sendSuccessResponse(res, 'Notifications marked as read');
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return sendErrorResponse(res, 'Failed to mark notifications as read', 500);
  }
};

// Archive notifications
const archiveNotifications = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user.id;

    await Notification.archive(userId, notificationIds);

    return sendSuccessResponse(res, 'Notifications archived successfully');
  } catch (error) {
    console.error('Error archiving notifications:', error);
    return sendErrorResponse(res, 'Failed to archive notifications', 500);
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await Notification.getUnreadCount(userId);

    return sendSuccessResponse(res, 'Unread count retrieved successfully', { unreadCount });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return sendErrorResponse(res, 'Failed to get unread count', 500);
  }
};

// Create notification (for internal use)
const createNotification = async (req, res) => {
  try {
    const { userId, type, title, message, data, priority = 'medium' } = req.body;

    const notification = await Notification.createNotification({
      userId,
      type,
      title,
      message,
      data,
      priority
    });

    return sendSuccessResponse(res, 'Notification created successfully', { notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    return sendErrorResponse(res, 'Failed to create notification', 500);
  }
};

// Send bulk notifications
const sendBulkNotifications = async (req, res) => {
  try {
    const { userIds, type, title, message, data, priority = 'medium' } = req.body;

    const notifications = await Notification.sendBulk(userIds, {
      type,
      title,
      message,
      data,
      priority
    });

    return sendSuccessResponse(res, 'Bulk notifications sent successfully', { 
      count: notifications.length 
    });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    return sendErrorResponse(res, 'Failed to send bulk notifications', 500);
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isActive: false },
      { new: true }
    );

    if (!notification) {
      return sendErrorResponse(res, 'Notification not found', 404);
    }

    return sendSuccessResponse(res, 'Notification deleted successfully');
  } catch (error) {
    console.error('Error deleting notification:', error);
    return sendErrorResponse(res, 'Failed to delete notification', 500);
  }
};

// Get notification by ID
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({ _id: id, userId, isActive: true })
      .populate('data.bookingId', 'status scheduledDate totalAmount')
      .populate('data.meetingId', 'title scheduledDate meetingLink')
      .populate('data.serviceId', 'title category');

    if (!notification) {
      return sendErrorResponse(res, 'Notification not found', 404);
    }

    // Mark as read if not already read
    if (!notification.isRead) {
      await notification.markAsRead();
    }

    return sendSuccessResponse(res, 'Notification retrieved successfully', { notification });
  } catch (error) {
    console.error('Error getting notification:', error);
    return sendErrorResponse(res, 'Failed to retrieve notification', 500);
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { userId, isActive: true, isRead: false },
      { isRead: true, status: 'read', readAt: new Date() }
    );

    return sendSuccessResponse(res, 'All notifications marked as read');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return sendErrorResponse(res, 'Failed to mark all notifications as read', 500);
  }
};

// Delete all notifications for user
const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );

    return sendSuccessResponse(res, 'All notifications deleted successfully', {
      deletedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    return sendErrorResponse(res, 'Failed to delete all notifications', 500);
  }
};

// Get notification statistics
const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Notification.aggregate([
      { $match: { userId, isActive: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: ['$isRead', 0, 1] } },
          byType: {
            $push: {
              type: '$type',
              isRead: '$isRead'
            }
          }
        }
      }
    ]);

    const typeStats = {};
    if (stats.length > 0 && stats[0].byType) {
      stats[0].byType.forEach(item => {
        if (!typeStats[item.type]) {
          typeStats[item.type] = { total: 0, unread: 0 };
        }
        typeStats[item.type].total++;
        if (!item.isRead) {
          typeStats[item.type].unread++;
        }
      });
    }

    return sendSuccessResponse(res, 'Notification statistics retrieved successfully', {
      total: stats[0]?.total || 0,
      unread: stats[0]?.unread || 0,
      byType: typeStats
    });
  } catch (error) {
    console.error('Error getting notification statistics:', error);
    return sendErrorResponse(res, 'Failed to get notification statistics', 500);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  archiveNotifications,
  getUnreadCount,
  createNotification,
  sendBulkNotifications,
  deleteNotification,
  getNotificationById,
  markAllAsRead,
  getNotificationStats,
  deleteAllNotifications
};
