const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/shared/models/User');
const MentorProfile = require('../src/MentorPanel/models/MentorProfile');

async function checkIds() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const targetEmail = 'uawan.official@gmail.com';
        const user = await User.findOne({ email: targetEmail });
        if (user) {
            console.log('USER_ID:' + user._id);
            const profile = await MentorProfile.findOne({ userId: user._id });
            if (profile) {
                console.log('PROFILE_ID:' + profile._id);
                console.log('PROFILE_SLUG:' + profile.slug);
            } else {
                console.log('PROFILE_NOT_FOUND');
            }
        } else {
            console.log('USER_NOT_FOUND');
        }

        // Also check if the ID mentioned by user exists
        const mentionedId = '695e8162aba0e7da1cbc2bfe';
        const mentionedUser = await User.findById(mentionedId);
        console.log('MENTIONED_USER_FOUND:' + (!!mentionedUser));
        const mentionedProfile = await MentorProfile.findById(mentionedId);
        console.log('MENTIONED_PROFILE_FOUND:' + (!!mentionedProfile));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

checkIds();
