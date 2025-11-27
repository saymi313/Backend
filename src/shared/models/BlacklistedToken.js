const mongoose = require('mongoose');

const blacklistedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  blacklistedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster lookups
blacklistedTokenSchema.index({ token: 1 });
blacklistedTokenSchema.index({ userId: 1 });
blacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index to auto-delete expired tokens

// Static method to check if token is blacklisted
blacklistedTokenSchema.statics.isBlacklisted = async function(token) {
  const blacklisted = await this.findOne({ token });
  return !!blacklisted;
};

// Static method to blacklist a token
blacklistedTokenSchema.statics.blacklistToken = async function(token, userId, expiresAt) {
  try {
    await this.create({
      token,
      userId,
      expiresAt
    });
    return true;
  } catch (error) {
    // If token is already blacklisted, that's fine
    if (error.code === 11000) {
      return true;
    }
    throw error;
  }
};

module.exports = mongoose.model('BlacklistedToken', blacklistedTokenSchema);

