const mongoose = require('mongoose');

const serviceFeedbackSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MentorService',
    required: [true, 'Service ID is required'],
    index: true
  },
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Mentor ID is required'],
    index: true
  },
  menteeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Mentee ID is required'],
    index: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  adminResponse: {
    type: String,
    default: null,
    trim: true,
    maxlength: [500, 'Admin response cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Compound index to ensure one feedback per mentee per service
serviceFeedbackSchema.index({ serviceId: 1, menteeId: 1 }, { unique: true });
serviceFeedbackSchema.index({ mentorId: 1, createdAt: -1 });
serviceFeedbackSchema.index({ serviceId: 1, createdAt: -1 });
serviceFeedbackSchema.index({ isVisible: 1 });

// Static method to get feedbacks by service
serviceFeedbackSchema.statics.getByService = function(serviceId, options = {}) {
  const {
    page = 1,
    limit = 10,
    includeInactive = false
  } = options;

  const query = { serviceId, isActive: true, isVisible: true };
  if (includeInactive) {
    delete query.isActive;
    delete query.isVisible;
  }

  return this.find(query)
    .populate('menteeId', 'profile.firstName profile.lastName profile.avatar email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to get feedbacks by mentor
serviceFeedbackSchema.statics.getByMentor = function(mentorId, options = {}) {
  const {
    page = 1,
    limit = 10,
    includeInactive = false
  } = options;

  const query = { mentorId, isActive: true, isVisible: true };
  if (includeInactive) {
    delete query.isActive;
    delete query.isVisible;
  }

  return this.find(query)
    .populate('serviceId', 'title category')
    .populate('menteeId', 'profile.firstName profile.lastName profile.avatar email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to check if mentee has already left feedback for a service
serviceFeedbackSchema.statics.hasFeedback = function(serviceId, menteeId) {
  return this.findOne({ serviceId, menteeId, isActive: true });
};

// Static method to calculate average rating for a service
serviceFeedbackSchema.statics.calculateAverageRating = async function(serviceId) {
  // Convert serviceId to ObjectId if it's a string
  const serviceObjectId = mongoose.Types.ObjectId.isValid(serviceId) 
    ? (typeof serviceId === 'string' ? new mongoose.Types.ObjectId(serviceId) : serviceId)
    : serviceId;
  
  const result = await this.aggregate([
    { $match: { serviceId: serviceObjectId, isActive: true, isVisible: true } },
    {
      $group: {
        _id: '$serviceId',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (result.length > 0) {
    return {
      rating: Math.round(result[0].averageRating * 10) / 10, // Round to 1 decimal place
      totalReviews: result[0].totalReviews
    };
  }

  return {
    rating: 0,
    totalReviews: 0
  };
};

module.exports = mongoose.model('ServiceFeedback', serviceFeedbackSchema);

