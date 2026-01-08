const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/shared/models/User');
const MentorProfile = require('../src/MentorPanel/models/MentorProfile');
const Service = require('../src/MentorPanel/models/Service');

async function verifyAtoZ() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const targetEmail = 'uawan.official@gmail.com';
        const user = await User.findOne({ email: targetEmail });
        if (user) {
            console.log('--- Comprehensive Verification ---');
            const profile = await MentorProfile.findOne({ userId: user._id });

            console.log('Title:', profile.title);
            console.log('Bio Length:', profile.bio.length);
            console.log('Education Count:', profile.education.length);
            console.log('Experience Count:', profile.experience.length);
            console.log('Achievements Count:', profile.achievements.length);
            console.log('Languages:', profile.languages.map(l => l.language).join(', '));
            console.log('Availability Timezone:', profile.availability.timezone);
            console.log('Success Story Title:', profile.successStory?.title);
            console.log('Badge:', profile.badge);

            const services = await Service.find({ mentorId: user._id });
            console.log('Services Count:', services.length);
            services.forEach(s => {
                console.log(`- ${s.title} [${s.category}]`);
            });

            console.log('User Profile Country:', user.profile.country);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

verifyAtoZ();
