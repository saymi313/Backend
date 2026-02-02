require('dotenv').config();
const mongoose = require('mongoose');
const MentorProfile = require('./src/MentorPanel/models/MentorProfile');
const User = require('./src/shared/models/User');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI;

async function listAllMentors() {
    try {
        let output = '';
        const log = (msg) => {
            console.log(msg);
            output += msg + '\n';
        };

        log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        log('✅ Connected\n');

        const mentors = await MentorProfile.find({})
            .populate('userId', 'profile.firstName profile.lastName email')
            .select('title isActive isVerified userId')
            .lean();

        log(`📊 Total Mentor Profiles in Database: ${mentors.length}\n`);

        log('='.repeat(80));
        log('MENTOR PROFILES STATUS:');
        log('='.repeat(80));

        mentors.forEach((mentor, index) => {
            const firstName = mentor.userId?.profile?.firstName || 'Unknown';
            const lastName = mentor.userId?.profile?.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const email = mentor.userId?.email || 'No email';

            log(`\n${index + 1}. ${fullName} (${email})`);
            log(`   Title: ${mentor.title}`);
            log(`   isActive: ${mentor.isActive ? '✅ TRUE' : '❌ FALSE'}`);
            log(`   isVerified: ${mentor.isVerified ? '✅ TRUE' : '❌ FALSE'}`);
            log(`   Visible in Mentee Panel: ${mentor.isActive && mentor.isVerified ? '✅ YES' : '❌ NO'}`);
        });

        log('\n' + '='.repeat(80));
        const visibleCount = mentors.filter(m => m.isActive && m.isVerified).length;
        log(`\n📈 SUMMARY:`);
        log(`   Total Mentors: ${mentors.length}`);
        log(`   Visible (Active & Verified): ${visibleCount}`);
        log(`   Hidden (Not Active or Not Verified): ${mentors.length - visibleCount}`);

        log('\n💡 To make a mentor visible:');
        log('   1. Set isActive: true');
        log('   2. Set isVerified: true (admin approval)');

        fs.writeFileSync('mentor-status-report.txt', output);
        log('\n📄 Full report saved to: mentor-status-report.txt');

        await mongoose.disconnect();
        log('\n✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
    }
}

listAllMentors();
