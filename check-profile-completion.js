require('dotenv').config();
const mongoose = require('mongoose');
const MentorProfile = require('./src/MentorPanel/models/MentorProfile');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI;

async function checkProfileCompletion() {
    try {
        let output = '';
        const log = (msg) => {
            console.log(msg);
            output += msg + '\n';
        };

        log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        log('✅ Connected\n');

        const mentors = await MentorProfile.find({ isActive: true, isVerified: true })
            .populate('userId', 'profile.firstName profile.lastName email')
            .select('title bio specializations education experience background userId')
            .lean();

        log(`📊 Total Active & Verified Mentors: ${mentors.length}\n`);

        log('='.repeat(90));
        log('PROFILE COMPLETION STATUS:');
        log('='.repeat(90));

        let completeCount = 0;
        let incompleteCount = 0;

        mentors.forEach((mentor, index) => {
            const firstName = mentor.userId?.profile?.firstName || 'Unknown';
            const lastName = mentor.userId?.profile?.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();

            // Check each required field
            const hasTitle = !!mentor.title;
            const hasBio = !!mentor.bio;
            const hasSpecializations = mentor.specializations?.length > 0;
            const hasEducation = mentor.education?.length > 0;
            const hasExperience = mentor.experience?.length > 0;
            const hasBackground = !!mentor.background;

            const isComplete = hasTitle && hasBio && hasSpecializations && hasEducation && hasExperience && hasBackground;

            if (isComplete) {
                completeCount++;
            } else {
                incompleteCount++;
            }

            log(`\n${index + 1}. ${fullName}`);
            log(`   Title: ${mentor.title}`);
            log(`   Profile Status: ${isComplete ? '✅ COMPLETE (100%)' : '❌ INCOMPLETE'}`);

            if (!isComplete) {
                log(`   Missing:`);
                if (!hasTitle) log(`      - Title`);
                if (!hasBio) log(`      - Bio`);
                if (!hasSpecializations) log(`      - Specializations (0 entries)`);
                if (!hasEducation) log(`      - Education (0 entries)`);
                if (!hasExperience) log(`      - Experience (0 entries)`);
                if (!hasBackground) log(`      - Background/Summary`);
            }

            log(`   Visible to Mentees: ${isComplete ? '✅ YES' : '❌ NO (Profile Incomplete)'}`);
        });

        log('\n' + '='.repeat(90));
        log(`\n📈 SUMMARY:`);
        log(`   Total Active & Verified: ${mentors.length}`);
        log(`   Complete Profiles (Visible): ${completeCount}`);
        log(`   Incomplete Profiles (Hidden): ${incompleteCount}`);

        log('\n💡 Required Fields for Visibility:');
        log('   1. ✅ Title');
        log('   2. ✅ Bio (min 50 chars)');
        log('   3. ✅ At least 1 Specialization');
        log('   4. ✅ At least 1 Education entry');
        log('   5. ✅ At least 1 Experience entry');
        log('   6. ✅ Background/Summary section');

        fs.writeFileSync('profile-completion-report.txt', output);
        log('\n📄 Full report saved to: profile-completion-report.txt');

        await mongoose.disconnect();
        log('\n✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
    }
}

checkProfileCompletion();
