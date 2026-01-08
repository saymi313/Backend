const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MentorProfile = require('../src/MentorPanel/models/MentorProfile');
const User = require('../src/shared/models/User');

async function verifySlug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const slug = 'usman-awan';
        const profile = await MentorProfile.findOne({ slug }).lean();

        if (profile) {
            console.log('✅ Found profile by slug:', slug);
            console.log('Profile ID:', profile._id);
            console.log('User ID from Profile:', profile.userId);

            const user = await User.findById(profile.userId).lean();
            if (user) {
                console.log('✅ Found user by ID from profile');
                console.log('User Email:', user.email);
                console.log('User Name:', user.profile?.firstName, user.profile?.lastName);
            }
        } else {
            console.log('❌ Profile not found by slug:', slug);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

verifySlug();
