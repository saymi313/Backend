const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/shared/models/User');
const MentorProfile = require('../src/MentorPanel/models/MentorProfile');

async function fixSlug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🌱 Connected to MongoDB');

        const targetEmail = 'uawan.official@gmail.com';
        const user = await User.findOne({ email: targetEmail });

        if (!user) {
            console.error('❌ User not found');
            process.exit(1);
        }

        const profile = await MentorProfile.findOne({ userId: user._id });
        if (!profile) {
            console.error('❌ Profile not found');
            process.exit(1);
        }

        const newSlug = 'usman-awan';
        profile.slug = newSlug;
        await profile.save();
        console.log(`✅ Slug updated to: ${newSlug}`);
        console.log(`Profile ID: ${profile._id}`);
        console.log(`User ID: ${user._id}`);

        // Check for the mystery ID
        const mysteryId = '695e8162aba0e7da1cbc2bfe';
        const mysteryProfile = await MentorProfile.findById(mysteryId);
        if (mysteryProfile) {
            const mysteryUser = await User.findById(mysteryProfile.userId);
            console.log(`🔍 Mystery ID ${mysteryId} belongs to:`, mysteryUser?.email || 'Unknown User');
        } else {
            console.log(`🔍 Mystery ID ${mysteryId} not found as a profile ID`);
            const mysteryUser = await User.findById(mysteryId);
            if (mysteryUser) {
                console.log(`🔍 Mystery ID ${mysteryId} belongs to User:`, mysteryUser.email);
            } else {
                console.log(`🔍 Mystery ID ${mysteryId} not found in database`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

fixSlug();
