const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'booking_created',
      'booking_confirmed',
      'booking_cancelled',
      'meeting_scheduled',
      'meeting_reminder',
      'meeting_started',
      'meeting_ended',
      'payment_successful',
      'payment_failed',
      'review_received',
      'message_received',
      'system_announcement',
      'mentor_verification',
      'mentor_approved',
      'mentor_rejected',
      'mentor_login_paused',
      'service_approved',
      'service_rejected',
      'payout_completed',
      'payout_rejected',
      'admin_announcement',
      'admin_response'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  data: {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      default: null
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MentorService',
      default: null
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      default: null
    },
    paymentId: {
      type: String,
      default: null
    },
    customData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  scheduledFor: {
    type: Date,
    default: null
  },
  deliveryChannels: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push', 'in-app'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending'
    },
    sentAt: {
      type: Date,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    error: {
      type: String,
      default: null
    }
  }],
  actionUrl: {
    type: String,
    default: null
  },
  actionText: {
    type: String,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
notificationSchema.index({ userId: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ sentAt: -1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });

// Virtual for time since sent
notificationSchema.virtual('timeAgo').get(function () {
  const now = new Date();
  const diff = now - this.sentAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
});

// Virtual for priority color
notificationSchema.virtual('priorityColor').get(function () {
  const colorMap = {
    'low': 'text-gray-500',
    'medium': 'text-blue-500',
    'high': 'text-orange-500',
    'urgent': 'text-red-500'
  };
  return colorMap[this.priority] || 'text-gray-500';
});

// Virtual for status color
notificationSchema.virtual('statusColor').get(function () {
  const colorMap = {
    'unread': 'text-blue-600',
    'read': 'text-gray-500',
    'archived': 'text-gray-400'
  };
  return colorMap[this.status] || 'text-gray-500';
});

// Ensure virtual fields are serialized
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

// Pre-save middleware to set default values
notificationSchema.pre('save', function (next) {
  // Set expiration date for certain notification types
  if (!this.expiresAt) {
    const expirationMap = {
      'meeting_reminder': 24 * 60 * 60 * 1000, // 24 hours
      'booking_created': 7 * 24 * 60 * 60 * 1000, // 7 days
      'payment_successful': 30 * 24 * 60 * 60 * 1000, // 30 days
      'system_announcement': 90 * 24 * 60 * 60 * 1000 // 90 days
    };

    if (expirationMap[this.type]) {
      this.expiresAt = new Date(Date.now() + expirationMap[this.type]);
    }
  }

  next();
});

// Static method to get notifications by user
notificationSchema.statics.getByUser = function (userId, options = {}) {
  const {
    status = 'unread',
    type = null,
    limit = 20,
    skip = 0,
    includeExpired = false
  } = options;

  const query = { userId, isActive: true };

  if (status !== 'all') {
    query.status = status;
  }

  if (type) {
    query.type = type;
  }

  if (!includeExpired) {
    query.$or = [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ];
  }

  return this.find(query)
    .populate('data.bookingId', 'status scheduledDate totalAmount')
    .populate('data.meetingId', 'title scheduledDate meetingLink')
    .populate('data.serviceId', 'title category')
    .sort({ sentAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    userId,
    isRead: false,
    isActive: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

// Static method to mark as read
notificationSchema.statics.markAsRead = function (userId, notificationIds = []) {
  const query = { userId, isActive: true };

  if (notificationIds.length > 0) {
    query._id = { $in: notificationIds };
  }

  return this.updateMany(query, {
    isRead: true,
    status: 'read',
    readAt: new Date()
  });
};

// Static method to archive notifications
notificationSchema.statics.archive = function (userId, notificationIds) {
  return this.updateMany(
    { _id: { $in: notificationIds }, userId },
    { status: 'archived' }
  );
};

// Static method to create notification
notificationSchema.statics.createNotification = function (notificationData) {
  return this.create(notificationData);
};

// Static method to send bulk notifications
notificationSchema.statics.sendBulk = function (userIds, notificationData) {
  const notifications = userIds.map(userId => ({
    ...notificationData,
    userId
  }));

  return this.insertMany(notifications);
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Instance method to archive
notificationSchema.methods.archive = function () {
  this.status = 'archived';
  return this.save();
};

// Instance method to update delivery status
notificationSchema.methods.updateDeliveryStatus = function (channel, status, error = null) {
  const deliveryChannel = this.deliveryChannels.find(ch => ch.type === channel);
  if (deliveryChannel) {
    deliveryChannel.status = status;
    if (status === 'sent') {
      deliveryChannel.sentAt = new Date();
    } else if (status === 'delivered') {
      deliveryChannel.deliveredAt = new Date();
    } else if (status === 'failed') {
      deliveryChannel.error = error;
    }
  }
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
