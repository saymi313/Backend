const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  categories: [{
    type: String,
    trim: true,
    required: true
  }],
  featureFlags: {
    enableMentorVerification: {
      type: Boolean,
      default: true
    },
    enablePayouts: {
      type: Boolean,
      default: true
    },
    autoApproveFeedbacks: {
      type: Boolean,
      default: false
    }
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists (singleton pattern)
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    // Create default settings if none exist
    settings = await this.create({
      categories: [
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
      featureFlags: {
        enableMentorVerification: true,
        enablePayouts: true,
        autoApproveFeedbacks: false
      }
    });
  }
  return settings;
};

// Update settings (always updates the single document)
settingsSchema.statics.updateSettings = async function(updateData, adminId) {
  const settings = await this.findOneAndUpdate(
    {},
    {
      ...updateData,
      updatedBy: adminId
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);

