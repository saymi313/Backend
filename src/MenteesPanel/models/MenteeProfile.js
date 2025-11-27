const mongoose = require('mongoose');

const menteeProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  educationLevel: {
    type: String,
    required: [true, 'Education level is required'],
    enum: [
      'High School',
      'Associate Degree',
      'Bachelor\'s Degree',
      'Master\'s Degree',
      'PhD',
      'Professional Degree',
      'Other'
    ]
  },
  currentInstitution: {
    type: String,
    trim: true
  },
  studyGoals: [{
    type: String,
    trim: true,
    maxlength: [100, 'Study goal cannot exceed 100 characters']
  }],
  targetCountries: [{
    type: String,
    trim: true,
    maxlength: [50, 'Country name cannot exceed 50 characters']
  }],
  budget: {
    type: Number,
    min: [0, 'Budget cannot be negative'],
    default: 0
  },
  budgetCurrency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'PKR']
  },
  preferences: {
    mentorGender: {
      type: String,
      enum: ['Any', 'Male', 'Female', 'Non-binary'],
      default: 'Any'
    },
    communicationStyle: {
      type: String,
      enum: ['Formal', 'Casual', 'Mixed'],
      default: 'Mixed'
    },
    preferredLanguage: {
      type: String,
      default: 'English'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  academicInterests: [{
    type: String,
    trim: true,
    maxlength: [50, 'Interest cannot exceed 50 characters']
  }],
  careerGoals: [{
    type: String,
    trim: true,
    maxlength: [100, 'Career goal cannot exceed 100 characters']
  }],
  timeline: {
    type: String,
    enum: [
      'Immediate (within 3 months)',
      'Short-term (3-6 months)',
      'Medium-term (6-12 months)',
      'Long-term (1-2 years)',
      'Flexible'
    ],
    default: 'Flexible'
  },
  previousExperience: {
    type: String,
    trim: true,
    maxlength: [500, 'Experience description cannot exceed 500 characters']
  },
  challenges: [{
    type: String,
    trim: true,
    maxlength: [100, 'Challenge description cannot exceed 100 characters']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  profileCompleteness: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Index for search functionality
menteeProfileSchema.index({ 
  studyGoals: 'text', 
  academicInterests: 'text',
  careerGoals: 'text'
});

menteeProfileSchema.index({ targetCountries: 1 });
menteeProfileSchema.index({ educationLevel: 1 });
menteeProfileSchema.index({ isActive: 1 });

// Virtual for full name (populated from User)
menteeProfileSchema.virtual('fullName').get(function() {
  return this.userId?.profile?.firstName + ' ' + this.userId?.profile?.lastName;
});

// Method to calculate profile completeness
menteeProfileSchema.methods.calculateCompleteness = function() {
  let completeness = 0;
  const fields = [
    'educationLevel',
    'studyGoals',
    'targetCountries',
    'academicInterests',
    'careerGoals',
    'timeline'
  ];
  
  fields.forEach(field => {
    if (this[field] && (Array.isArray(this[field]) ? this[field].length > 0 : this[field])) {
      completeness += (100 / fields.length);
    }
  });
  
  this.profileCompleteness = Math.round(completeness);
  return this.profileCompleteness;
};

// Method to add study goal
menteeProfileSchema.methods.addStudyGoal = function(goal) {
  if (!this.studyGoals.includes(goal)) {
    this.studyGoals.push(goal);
  }
  return this.save();
};

// Method to remove study goal
menteeProfileSchema.methods.removeStudyGoal = function(goal) {
  this.studyGoals = this.studyGoals.filter(g => g !== goal);
  return this.save();
};

// Method to add target country
menteeProfileSchema.methods.addTargetCountry = function(country) {
  if (!this.targetCountries.includes(country)) {
    this.targetCountries.push(country);
  }
  return this.save();
};

// Method to remove target country
menteeProfileSchema.methods.removeTargetCountry = function(country) {
  this.targetCountries = this.targetCountries.filter(c => c !== country);
  return this.save();
};

// Pre-save middleware to calculate completeness
menteeProfileSchema.pre('save', function(next) {
  this.calculateCompleteness();
  next();
});

module.exports = mongoose.model('MenteeProfile', menteeProfileSchema);
