const mongoose = require('mongoose');
const Meeting = require('./src/shared/models/Meeting');

const MONGO_URI = 'mongodb+srv://scholarslee:ep86ZVFpucpkCSlm@scholarslee.44cebnm.mongodb.net/scholarslee_db?retryWrites=true&w=majority&appName=Scholarslee';

const debugMeetings = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        const report = [];
        report.push(`Checking meetings for potential matches...`);

        // 1. Check ALL meetings
        const allMeetings = await Meeting.find({}).sort({ createdAt: -1 }).limit(10);
        report.push(`\n--- Last 10 Meetings in DB ---`);
        allMeetings.forEach(m => {
            report.push(`ID: ${m._id}`);
            report.push(`  MentorID: ${m.mentorId} (Type: ${typeof m.mentorId})`);
            report.push(`  StartTime: ${m.startTime} (Type: ${typeof m.startTime})`);
            report.push(`  Status: ${m.status}`);
            report.push(`  Title: ${m.title}`);
            report.push('--------------------------------');
        });

        // 2. Check for the specific Mentor ID from user logs
        const targetMentorId = '6945933f8ae8ff4516363150';
        report.push(`\n--- Searching for Mentor: ${targetMentorId} ---`);

        // Exact string match check
        const byString = await Meeting.find({ mentorId: targetMentorId });
        report.push(`Found by Exact String: ${byString.length}`);

        // ObjectId match check
        try {
            const byObjectId = await Meeting.find({ mentorId: new mongoose.Types.ObjectId(targetMentorId) });
            report.push(`Found by ObjectId: ${byObjectId.length}`);
        } catch (e) {
            report.push(`ObjectId search failed: ${e.message}`);
        }

        const fs = require('fs');
        fs.writeFileSync('debug_report.txt', report.join('\n'));
        console.log('Report written to debug_report.txt');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
};

debugMeetings();
