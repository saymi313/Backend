const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/shared/models/User');
const MentorProfile = require('../src/MentorPanel/models/MentorProfile');

async function testSlugGeneration() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🌱 Connected to MongoDB');

        // 1. Create a dummy user
        const timestamp = Date.now();
        const dummyEmail = `test.slug.${timestamp}@example.com`;
        const user = new User({
            email: dummyEmail,
            password: 'password123',
            authProvider: 'local',
            role: 'mentor',
            profile: {
                firstName: 'Test',
                lastName: 'Slug User ' + timestamp,
                avatar: '',
                country: 'Testland'
            },
            isVerified: true
        });
        await user.save();
        console.log(`✅ Dummy user created: ${dummyEmail}`);

        // 2. Create mentor profile
        const profile = new MentorProfile({
            userId: user._id,
            title: 'Test Mentor',
            bio: 'This is a test bio for slug generation. It must be at least 50 characters long to satisfy the model validation.'
        });

        await profile.save();
        console.log(`✅ Mentor profile saved. Generated slug: ${profile.slug}`);

        // Check if it matches expected pattern
        const expectedPrefix = 'test-slug-user';
        if (profile.slug.startsWith(expectedPrefix)) {
            console.log('🎉 Success! Slug follows the name-based pattern.');
        } else {
            console.log('❌ Failure! Slug does not match expected pattern.');
        }

        // 3. Test uniqueness (create another one with same name)
        const user2 = new User({
            email: `test.slug.2.${timestamp}@example.com`,
            password: 'password123',
            authProvider: 'local',
            role: 'mentor',
            profile: user.profile, // Same name
            isVerified: true
        });
        await user2.save();

        const profile2 = new MentorProfile({
            userId: user2._id,
            title: 'Test Mentor 2',
            bio: 'This is a test bio for slug generation. It must be at least 50 characters long to satisfy the model validation.'
        });
        await profile2.save();
        console.log(`✅ Second profile saved. Generated slug: ${profile2.slug}`);

        if (profile2.slug.includes('-1')) {
            console.log('🎉 Success! Unique slug generated with counter.');
        }

        // Cleanup
        await MentorProfile.deleteOne({ _id: profile._id });
        await MentorProfile.deleteOne({ _id: profile2._id });
        await User.deleteOne({ _id: user._id });
        await User.deleteOne({ _id: user2._id });
        console.log('🗑️  Cleanup complete.');

    } catch (error) {
        console.error('❌ Error testing slug generation:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

testSlugGeneration();
