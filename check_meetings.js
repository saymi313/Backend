const mongoose = require('mongoose');
const Meeting = require('./src/shared/models/Meeting');

// URI taken from user's previous shared .env content
const MONGO_URI = 'mongodb+srv://scholarslee:ep86ZVFpucpkCSlm@scholarslee.44cebnm.mongodb.net/scholarslee_db?retryWrites=true&w=majority&appName=Scholarslee';

const checkMeetings = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        let report = `✅ Connected to MongoDB\n`;

        const count = await Meeting.countDocuments();
        report += `Total Meetings in DB: ${count}\n`;

        const meetings = await Meeting.find({})
            .sort({ createdAt: -1 })
            .limit(5);

        if (meetings.length === 0) {
            report += '⚠️ No meetings found.\n';
        } else {
            report += 'Recent Meetings:\n';
            meetings.forEach(m => {
                report += `- [${m.createdAt}] Title: ${m.title || 'N/A'}, Mentee: ${m.menteeName || 'N/A'}, StartTime: ${m.startTime}\n`;
            });
        }
        const fs = require('fs');
        fs.writeFileSync('meetings_report.txt', report);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
};

checkMeetings();
