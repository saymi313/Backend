const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/shared/models/User');
const MentorProfile = require('../src/MentorPanel/models/MentorProfile');

async function checkProfiles() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const id1 = '671fb45a8df2d8544a04d3de';
        const id2 = '695e8162aba0e7da1cbc2bfe';

        const p1 = await MentorProfile.findOne({ userId: id1 });
        console.log(`User ${id1} profile:`, p1 ? p1._id : 'NONE');

        const p2 = await MentorProfile.findOne({ userId: id2 });
        console.log(`User ${id2} profile:`, p2 ? p2._id : 'NONE');

        const p3 = await MentorProfile.findById(id1);
        console.log(`MentProfile by ID ${id1}:`, p3 ? p3._id : 'NONE');

        const p4 = await MentorProfile.findById(id2);
        console.log(`MentProfile by ID ${id2}:`, p4 ? p4._id : 'NONE');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

checkProfiles();
