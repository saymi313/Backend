const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../utils/constants/roles');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: function () {
      return this.authProvider === 'local';
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  googleId: {
    type: String,
    default: null,
    sparse: true // Allows multiple null values
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  googleAccessToken: {
    type: String,
    default: null,
    select: false
  },
  googleRefreshToken: {
    type: String,
    default: null,
    select: false
  },
  stripeCustomerId: {
    type: String,
    default: null,
    sparse: true,
    trim: true
  },
  role: {
    type: String,
    enum: [...Object.values(USER_ROLES), null],  // Allow null for new Google users
    required: function () {
      // Role is required for local auth users, optional for Google OAuth
      return this.authProvider === 'local';
    },
    validate: {
      validator: function (value) {
        // If Google OAuth and role is null, that's fine (they'll select later)
        if (this.authProvider === 'google' && value === null) {
          return true;
        }
        // Otherwise, role must be a valid role
        return Object.values(USER_ROLES).includes(value);
      },
      message: 'Invalid role. Must be mentor, mentee, or admin (or null for Google OAuth users)'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationOTP: {
    type: String,
    select: false
  },
  verificationOTPExpires: {
    type: Date,
    select: false
  },
  mentorApprovalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: null // null means auto-approved (for existing mentors)
  },
  isLoginPaused: {
    type: Boolean,
    default: false
  },
  needsRoleSelection: {
    type: Boolean,
    default: false
  },
  profile: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: false,  // Not required for Google OAuth users who may only have first name
      default: '',
      trim: true
    },
    avatar: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: ''
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash password if it's modified and user is using local auth
  if (this.authProvider !== 'local' || !this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function () {
  const lastName = this.profile.lastName || '';
  return lastName ? `${this.profile.firstName} ${lastName}`.trim() : this.profile.firstName;
});

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
