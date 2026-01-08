const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/shared/models/User');
const MentorProfile = require('../src/MentorPanel/models/MentorProfile');
const Service = require('../src/MentorPanel/models/Service');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const targetEmail = 'uawan.official@gmail.com';
        const mentor = await User.findOne({ email: targetEmail });
        if (mentor) {
            console.log('TARGET_MENTOR_ID:' + mentor._id);
            const services = await Service.find({ mentorId: mentor._id });
            console.log('TARGET_EXISTING_SERVICES:' + services.map(s => s.title).join('|'));
        }

        const soban = await User.findOne({
            $or: [
                { 'profile.firstName': /Soban/i },
                { 'profile.lastName': /Ahsan/i }
            ]
        });

        if (soban) {
            const sobanServices = await Service.find({ mentorId: soban._id });
            console.log('SOBAN_SERVICE_TITLES:' + sobanServices.map(s => s.title).join('|'));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

checkData();
