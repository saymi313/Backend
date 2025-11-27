/**
 * Script to set mentor badge for testing
 * Run with: node src/MentorPanel/scripts/setMentorBadge.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const MentorProfile = require('../models/MentorProfile');

const MENTOR_USER_ID = '68f39ff9dd5b2684677e80cb'; // usman@gmail.com
const BADGE_TO_SET = 'Best Seller';

async function setMentorBadge() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scholarslee', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find mentor profile
    const mentorProfile = await MentorProfile.findOne({ userId: MENTOR_USER_ID });
    
    if (!mentorProfile) {
      console.log('❌ Mentor profile not found for userId:', MENTOR_USER_ID);
      console.log('💡 Creating a new profile with Best Seller badge...');
      
      // Create profile if it doesn't exist
      const newProfile = new MentorProfile({
        userId: MENTOR_USER_ID,
        title: 'Software Engineer',
        bio: 'Experienced mentor with Best Seller badge for testing purposes.',
        badge: BADGE_TO_SET
      });
      await newProfile.save();
      console.log('✅ Created new mentor profile with Best Seller badge');
    } else {
      // Update existing profile
      mentorProfile.badge = BADGE_TO_SET;
      await mentorProfile.save();
      console.log(`✅ Updated mentor profile badge to: ${BADGE_TO_SET}`);
    }

    console.log('✅ Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setMentorBadge();

