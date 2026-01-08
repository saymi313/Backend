const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/shared/models/User');
const MentorProfile = require('../src/MentorPanel/models/MentorProfile');

async function checkDuplicates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🌱 Connected to MongoDB');

        const targetEmail = 'uawan.official@gmail.com';
        const users = await User.find({ email: targetEmail });

        console.log(`Found ${users.length} users with email ${targetEmail}`);
        for (const u of users) {
            console.log(`- User ID: ${u._id}, Role: ${u.role}, CreatedAt: ${u.createdAt}`);
            const profile = await MentorProfile.findOne({ userId: u._id });
            console.log(`  Profile: ${profile ? profile._id : 'NOT FOUND'}, Slug: ${profile ? profile.slug : 'N/A'}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

checkDuplicates();
