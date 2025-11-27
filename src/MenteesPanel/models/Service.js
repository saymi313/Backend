const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Package name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Package price is required'],
    min: [0, 'Price cannot be negative']
  },
  duration: {
    type: String,
    required: [true, 'Package duration is required'],
    trim: true
  },
  features: [{
    type: String,
    trim: true
  }],
  calls: {
    type: Number,
    required: [true, 'Number of calls is required'],
    min: [0, 'Calls cannot be negative']
  }
});

const serviceSchema = new mongoose.Schema({
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Mentor ID is required']
  },
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Service category is required'],
    enum: {
      values: [
        'Study Abroad Guidance',
        'University Applications',
        'Visa Assistance',
        'Career Counseling',
        'Language Learning',
        'Academic Writing',
        'Research Guidance',
        'Interview Preparation',
        'Scholarship Guidance',
        'Cultural Orientation'
      ],
      message: 'Invalid service category'
    }
  },
  packages: [packageSchema],
  images: [{
    type: String,
    trim: true
  }],
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: [0, 'Total reviews cannot be negative']
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'pending', 'approved', 'rejected'],
      message: 'Invalid service status'
    },
    default: 'draft'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  location: {
    country: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    }
  },
  availability: {
    timezone: {
      type: String,
      trim: true
    },
    workingHours: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
serviceSchema.index({ mentorId: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ status: 1 });
serviceSchema.index({ rating: -1 });
serviceSchema.index({ createdAt: -1 });
serviceSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual for average rating
serviceSchema.virtual('averageRating').get(function() {
  return this.totalReviews > 0 ? (this.rating / this.totalReviews).toFixed(1) : 0;
});

// Ensure virtual fields are serialized
serviceSchema.set('toJSON', { virtuals: true });
serviceSchema.set('toObject', { virtuals: true });

// Pre-save middleware to validate packages
serviceSchema.pre('save', function(next) {
  if (this.packages.length === 0) {
    return next(new Error('At least one package is required'));
  }
  
  // Ensure package names are unique within the service
  const packageNames = this.packages.map(pkg => pkg.name.toLowerCase());
  const uniqueNames = new Set(packageNames);
  
  if (packageNames.length !== uniqueNames.size) {
    return next(new Error('Package names must be unique within a service'));
  }
  
  next();
});

// Static method to get services by category
serviceSchema.statics.getByCategory = function(category) {
  return this.find({ 
    category, 
    status: 'approved', 
    isActive: true 
  }).populate('mentorId', 'profile firstName lastName');
};

// Static method to search services
serviceSchema.statics.searchServices = function(query, filters = {}) {
  const searchQuery = {
    status: 'approved',
    isActive: true,
    ...filters
  };

  if (query) {
    searchQuery.$text = { $search: query };
  }

  return this.find(searchQuery)
    .populate('mentorId', 'profile firstName lastName')
    .sort({ rating: -1, createdAt: -1 });
};

// Instance method to update rating
serviceSchema.methods.updateRating = function(newRating) {
  const totalRating = (this.rating * this.totalReviews) + newRating;
  this.totalReviews += 1;
  this.rating = totalRating / this.totalReviews;
  return this.save();
};

module.exports = mongoose.model('MenteeService', serviceSchema);
