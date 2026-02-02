require('dotenv').config();
const mongoose = require('mongoose');
const MentorProfile = require('./src/MentorPanel/models/MentorProfile');

const MONGODB_URI = process.env.MONGODB_URI;

async function verifyAllMentors() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected\n');

        // Find all unverified mentors
        const unverifiedMentors = await MentorProfile.find({ isVerified: false })
            .populate('userId', 'profile.firstName profile.lastName email')
            .select('title isActive isVerified userId');

        if (unverifiedMentors.length === 0) {
            console.log('✅ All mentors are already verified!');
            await mongoose.disconnect();
            return;
        }

        console.log(`📋 Found ${unverifiedMentors.length} unverified mentor(s):\n`);
        unverifiedMentors.forEach((mentor, index) => {
            const firstName = mentor.userId?.profile?.firstName || 'Unknown';
            const lastName = mentor.userId?.profile?.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            console.log(`${index + 1}. ${fullName} - ${mentor.title}`);
        });

        // Verify all mentors
        console.log('\n⚙️ Verifying all mentors...');
        const result = await MentorProfile.updateMany(
            { isVerified: false },
            { $set: { isVerified: true } }
        );

        console.log(`✅ Successfully verified ${result.modifiedCount} mentor(s)!\n`);

        // Verify the changes
        const nowVisible = await MentorProfile.countDocuments({ isActive: true, isVerified: true });
        console.log(`📊 Total visible mentors now: ${nowVisible}`);

        await mongoose.disconnect();
        console.log('\n✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
    }
}

verifyAllMentors();
