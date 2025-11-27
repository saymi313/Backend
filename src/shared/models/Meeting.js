const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: false,
    default: null
  },
  menteeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  meetingLink: {
    type: String,
    required: true
  },
  meetingId: {
    type: String,
    required: true
  },
  googleEventId: {
    type: String,
    required: false,
    default: null
  },
  googleCalendarLink: {
    type: String,
    required: false,
    default: null
  },
  meetingPassword: {
    type: String,
    default: null
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  meetingType: {
    type: String,
    enum: ['google-meet', 'zoom', 'teams', 'custom'],
    default: 'google-meet'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push'],
      required: true
    },
    sentAt: {
      type: Date,
      default: null
    },
    scheduledFor: {
      type: Date,
      required: true
    }
  }],
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['mentee', 'mentor'],
      required: true
    },
    joinedAt: {
      type: Date,
      default: null
    },
    leftAt: {
      type: Date,
      default: null
    },
    isPresent: {
      type: Boolean,
      default: false
    }
  }],
  recordingUrl: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  feedback: {
    menteeFeedback: {
      type: String,
      default: null
    },
    mentorFeedback: {
      type: String,
      default: null
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startedAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
meetingSchema.index({ bookingId: 1 });
meetingSchema.index({ menteeId: 1 });
meetingSchema.index({ mentorId: 1 });
meetingSchema.index({ scheduledDate: 1, status: 1 }); // Compound index for calendar queries
meetingSchema.index({ status: 1 });
meetingSchema.index({ meetingId: 1 });
meetingSchema.index({ googleEventId: 1 });

// Virtual for meeting duration in hours
meetingSchema.virtual('durationHours').get(function() {
  return this.duration / 60;
});

// Virtual for formatted scheduled date
meetingSchema.virtual('formattedDate').get(function() {
  return this.scheduledDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for meeting status display
meetingSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'scheduled': 'Scheduled',
    'in-progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'no-show': 'No Show'
  };
  return statusMap[this.status] || this.status;
});

// Ensure virtual fields are serialized
meetingSchema.set('toJSON', { virtuals: true });
meetingSchema.set('toObject', { virtuals: true });

// Pre-save middleware to validate meeting
meetingSchema.pre('save', function(next) {
  // Allow past dates for meetings created after scheduling (flexible validation)
  // Only validate for very old dates (more than 1 year in the past)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (this.isNew && this.scheduledDate < oneYearAgo) {
    return next(new Error('Scheduled date cannot be more than 1 year in the past'));
  }
  
  // Validate duration is positive
  if (this.duration <= 0) {
    return next(new Error('Duration must be positive'));
  }
  
  // Validate meeting link format
  if (!this.meetingLink || !this.meetingLink.includes('http')) {
    return next(new Error('Valid meeting link is required'));
  }
  
  next();
});

// Static method to get meetings by user
meetingSchema.statics.getByUser = function(userId, role) {
  const query = role === 'mentee' ? { menteeId: userId } : { mentorId: userId };
  return this.find(query)
    .populate('menteeId', 'profile firstName lastName email')
    .populate('mentorId', 'profile firstName lastName email')
    .populate('bookingId', 'serviceId totalAmount')
    .sort({ scheduledDate: -1 });
};

// Static method to get upcoming meetings
meetingSchema.statics.getUpcoming = function(userId, role) {
  const query = role === 'mentee' ? { menteeId: userId } : { mentorId: userId };
  query.status = { $in: ['scheduled', 'in-progress'] };
  query.scheduledDate = { $gte: new Date() };
  
  return this.find(query)
    .populate('menteeId', 'profile firstName lastName email')
    .populate('mentorId', 'profile firstName lastName email')
    .populate('bookingId', 'serviceId totalAmount')
    .sort({ scheduledDate: 1 });
};

// Static method to get today's meetings
meetingSchema.statics.getTodaysMeetings = function(userId, role) {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  
  const query = role === 'mentee' ? { menteeId: userId } : { mentorId: userId };
  query.scheduledDate = { $gte: startOfDay, $lte: endOfDay };
  query.status = { $in: ['scheduled', 'in-progress'] };
  
  return this.find(query)
    .populate('menteeId', 'profile firstName lastName email')
    .populate('mentorId', 'profile firstName lastName email')
    .populate('bookingId', 'serviceId totalAmount')
    .sort({ scheduledDate: 1 });
};

// Instance method to start meeting
meetingSchema.methods.startMeeting = function() {
  this.status = 'in-progress';
  this.startedAt = new Date();
  return this.save();
};

// Instance method to end meeting
meetingSchema.methods.endMeeting = function() {
  this.status = 'completed';
  this.endedAt = new Date();
  return this.save();
};

// Instance method to cancel meeting
meetingSchema.methods.cancelMeeting = function(reason = '') {
  this.status = 'cancelled';
  this.notes = reason;
  return this.save();
};

// Instance method to mark no-show
meetingSchema.methods.markNoShow = function() {
  this.status = 'no-show';
  return this.save();
};

module.exports = mongoose.model('Meeting', meetingSchema);
