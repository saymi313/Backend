const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date,
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'voice', 'video'],
      default: 'text'
    }
  },
  unreadCount: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    }
  }],
  isPinned: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isMuted: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isArchived: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for efficient querying
conversationSchema.index({ participants: 1 });
conversationSchema.index({ 'lastMessage.timestamp': -1 });

// Method to increment unread count
conversationSchema.methods.incrementUnread = function(userId) {
  const unread = this.unreadCount.find(u => u.userId.toString() === userId.toString());
  if (unread) {
    unread.count += 1;
  } else {
    this.unreadCount.push({ userId, count: 1 });
  }
  return this.save();
};

// Method to reset unread count
conversationSchema.methods.resetUnread = function(userId) {
  const unread = this.unreadCount.find(u => u.userId.toString() === userId.toString());
  if (unread) {
    unread.count = 0;
  }
  return this.save();
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;

