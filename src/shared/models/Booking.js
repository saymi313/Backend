const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
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
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MentorService',
    required: true
  },
  packageId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentId: {
    type: String,
    default: null
  },
  meetingLink: {
    type: String,
    default: null
  },
  meetingId: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  menteeNotes: {
    type: String,
    default: ''
  },
  mentorNotes: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
bookingSchema.index({ menteeId: 1 });
bookingSchema.index({ mentorId: 1 });
bookingSchema.index({ serviceId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ scheduledDate: 1 });
bookingSchema.index({ createdAt: -1 });

// Virtual for booking duration in hours
bookingSchema.virtual('durationHours').get(function() {
  return this.duration / 60;
});

// Virtual for formatted scheduled date
bookingSchema.virtual('formattedDate').get(function() {
  return this.scheduledDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Ensure virtual fields are serialized
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

// Pre-save middleware to validate booking
bookingSchema.pre('save', function(next) {
  // Validate that scheduled date is in the future
  if (this.scheduledDate <= new Date()) {
    return next(new Error('Scheduled date must be in the future'));
  }
  
  // Validate duration is positive
  if (this.duration <= 0) {
    return next(new Error('Duration must be positive'));
  }
  
  // Validate total amount is positive
  if (this.totalAmount <= 0) {
    return next(new Error('Total amount must be positive'));
  }
  
  next();
});

// Static method to get bookings by user
bookingSchema.statics.getByUser = function(userId, role) {
  const query = role === 'mentee' ? { menteeId: userId } : { mentorId: userId };
  return this.find(query)
    .populate('menteeId', 'profile firstName lastName email')
    .populate('mentorId', 'profile firstName lastName email')
    .populate('serviceId', 'title category packages')
    .sort({ createdAt: -1 });
};

// Static method to get upcoming bookings
bookingSchema.statics.getUpcoming = function(userId, role) {
  const query = role === 'mentee' ? { menteeId: userId } : { mentorId: userId };
  query.status = { $in: ['confirmed', 'in-progress'] };
  query.scheduledDate = { $gte: new Date() };
  
  return this.find(query)
    .populate('menteeId', 'profile firstName lastName email')
    .populate('mentorId', 'profile firstName lastName email')
    .populate('serviceId', 'title category packages')
    .sort({ scheduledDate: 1 });
};

// Instance method to update status
bookingSchema.methods.updateStatus = function(newStatus, notes = '') {
  this.status = newStatus;
  
  if (newStatus === 'completed') {
    this.completedAt = new Date();
  } else if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
    this.cancellationReason = notes;
  }
  
  return this.save();
};

module.exports = mongoose.model('Booking', bookingSchema);
