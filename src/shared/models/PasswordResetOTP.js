const mongoose = require('mongoose');

const passwordResetOTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'],
    minlength: 4,
    maxlength: 4
  },
  expiresAt: {
    type: Date,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
passwordResetOTPSchema.index({ email: 1, expiresAt: 1 });

// Check if OTP is expired
passwordResetOTPSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Check if OTP is valid (not expired, not verified, within attempt limit)
passwordResetOTPSchema.methods.isValid = function() {
  return !this.isExpired() && !this.verified && this.attempts < 5;
};

// Increment attempts
passwordResetOTPSchema.methods.incrementAttempts = async function() {
  this.attempts += 1;
  await this.save();
  return this.attempts;
};

// Mark as verified
passwordResetOTPSchema.methods.markVerified = async function() {
  this.verified = true;
  await this.save();
};

// Static method to generate 4-digit OTP
passwordResetOTPSchema.statics.generateOTP = function() {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Static method to create OTP with 5-minute expiry
passwordResetOTPSchema.statics.createOTP = async function(email) {
  // Delete any existing OTP for this email
  await this.deleteMany({ email: email.toLowerCase() });
  
  const otp = this.generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
  
  const otpRecord = await this.create({
    email: email.toLowerCase(),
    otp,
    expiresAt
  });
  
  return { otpRecord, otp };
};

// TTL index to auto-delete expired OTPs after 1 hour
passwordResetOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('PasswordResetOTP', passwordResetOTPSchema);

