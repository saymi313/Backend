const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  degree: {
    type: String,
    required: [true, 'Degree is required'],
    trim: true
  },
  institution: {
    type: String,
    required: [true, 'Institution is required'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Graduation year is required'],
    min: [1900, 'Year must be after 1900'],
    max: [new Date().getFullYear() + 10, 'Year cannot be more than 10 years in the future'] // Allow future years for expected graduation
  },
  field: {
    type: String,
    trim: true
  },
  gpa: {
    type: Number,
    min: 0,
    max: 4.0
  }
}, { timestamps: true });

const experienceSchema = new mongoose.Schema({
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true
  },
  duration: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  isCurrent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const mentorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: [true, 'Professional title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
    sparse: true // Allows null/undefined for existing records until migration
  },
  bio: {
    type: String,
    required: [true, 'Bio is required'],
    trim: true,
    minlength: [50, 'Bio must be at least 50 characters'],
    maxlength: [1000, 'Bio cannot exceed 1000 characters']
  },
  specializations: [{
    type: String,
    trim: true,
    maxlength: [50, 'Specialization cannot exceed 50 characters']
  }],
  education: [educationSchema],
  experience: [experienceSchema],
  achievements: [{
    type: String,
    trim: true,
    maxlength: [1000, 'Achievement cannot exceed 1000 characters']
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    type: String // File paths to verification documents
  }],
  availability: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    workingHours: {
      type: String,
      default: '9 AM - 5 PM'
    },
    daysAvailable: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }]
  },
  languages: [{
    language: {
      type: String,
      required: true,
      trim: true
    },
    proficiency: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Fluent', 'Native'],
      required: true
    }
  }],
  socialLinks: {
    linkedin: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    twitter: {
      type: String,
      trim: true
    }
  },
  // Extended profile fields
  background: {
    type: String,
    trim: true,
    maxlength: [5000, 'Background cannot exceed 5000 characters']
  },
  recommendations: [{
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    fromName: { type: String, trim: true },
    text: { type: String, trim: true, maxlength: 2000 },
    rating: { type: Number, min: 1, max: 5, default: null },
    createdAt: { type: Date, default: Date.now }
  }],
  connections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MentorService'
  }],
  successStory: {
    title: { type: String, trim: true },
    content: { type: String, trim: true, maxlength: 5000 },
    mediaUrls: [{ type: String }],
    createdAt: { type: Date, default: null },
    isPublished: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  badge: {
    type: String,
    enum: ['Beginner', 'Level 1 Seller', 'Level 2 Seller', 'Best Seller'],
    default: 'Beginner'
  }
}, {
  timestamps: true
});

// Index for search functionality
mentorProfileSchema.index({
  title: 'text',
  bio: 'text',
  specializations: 'text'
});

mentorProfileSchema.index({ isVerified: 1, isActive: 1 });
mentorProfileSchema.index({ rating: -1 });

// Compound index for landing page query optimization
mentorProfileSchema.index({
  isActive: 1,
  isVerified: 1,
  rating: -1,
  totalReviews: -1
});

// Pre-save hook to generate slug if not exists
mentorProfileSchema.pre('save', async function (next) {
  // Generate slug from name if it doesn't exist
  if (!this.slug && this.userId) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.userId);

      if (!user) {
        // Fallback to userId if user not found
        this.slug = this.userId.toString();
        return next();
      }

      const { firstName, lastName } = user.profile;
      let baseSlug = `${firstName || ''} ${lastName || ''}`
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // remove non-alphanumeric except spaces and hyphens
        .replace(/[\s_-]+/g, '-') // replace spaces, underscores, hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // trim hyphens

      if (!baseSlug) {
        baseSlug = 'mentor';
      }

      let slug = baseSlug;
      let counter = 1;
      // Check for uniqueness
      let exists = await mongoose.model('MentorProfile').findOne({ slug });

      while (exists) {
        slug = `${baseSlug}-${counter}`;
        exists = await mongoose.model('MentorProfile').findOne({ slug });
        counter++;
      }

      this.slug = slug;
    } catch (err) {
      console.error('Error generating slug:', err);
      // Final fallback to userId on error to prevent save failure
      this.slug = this.userId.toString();
    }
  }
  next();
});

// Virtual for full name (populated from User)
mentorProfileSchema.virtual('fullName').get(function () {
  return this.userId?.profile?.firstName + ' ' + this.userId?.profile?.lastName;
});

// Method to calculate average rating
mentorProfileSchema.methods.calculateRating = function () {
  // This would be implemented when reviews are added
  return this.rating;
};

// Method to add specialization
mentorProfileSchema.methods.addSpecialization = function (specialization) {
  if (!this.specializations.includes(specialization)) {
    this.specializations.push(specialization);
  }
  return this.save();
};

// Method to remove specialization
mentorProfileSchema.methods.removeSpecialization = function (specialization) {
  this.specializations = this.specializations.filter(spec => spec !== specialization);
  return this.save();
};

module.exports = mongoose.model('MentorProfile', mentorProfileSchema);
