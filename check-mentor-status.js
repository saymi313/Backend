require('dotenv').config();
const mongoose = require('mongoose');

async function checkMentorStatus() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const User = require('./src/shared/models/User');
        const PendingUser = require('./src/shared/models/PendingUser');

        const email = 'saymi.usa313@gmail.com'; // Replace with the mentor's email

        console.log(`🔍 Checking status for: ${email}\n`);

        // Check User collection
        const user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            console.log('✅ FOUND IN USER COLLECTION:');
            console.log(`   - ID: ${user._id}`);
            console.log(`   - Role: ${user.role}`);
            console.log(`   - isVerified: ${user.isVerified}`);
            console.log(`   - isActive: ${user.isActive}`);
            console.log(`   - mentorApprovalStatus: ${user.mentorApprovalStatus}`);
            console.log(`   - isLoginPaused: ${user.isLoginPaused}`);
            console.log(`   - authProvider: ${user.authProvider}`);
        } else {
            console.log('❌ NOT FOUND IN USER COLLECTION');
        }

        console.log('');

        // Check PendingUser collection
        const pendingUser = await PendingUser.findOne({ email: email.toLowerCase() });
        if (pendingUser) {
            console.log('✅ FOUND IN PENDINGUSER COLLECTION:');
            console.log(`   - ID: ${pendingUser._id}`);
            console.log(`   - Role: ${pendingUser.role}`);
            console.log(`   - mentorApprovalStatus: ${pendingUser.mentorApprovalStatus}`);
            console.log(`   - verificationOTP: ${pendingUser.verificationOTP ? 'SET' : 'NOT SET'}`);
            console.log(`   - verificationOTPExpires: ${pendingUser.verificationOTPExpires}`);

            if (pendingUser.verificationOTPExpires) {
                const isExpired = new Date() > pendingUser.verificationOTPExpires;
                console.log(`   - OTP Expired: ${isExpired}`);
            }
        } else {
            console.log('❌ NOT FOUND IN PENDINGUSER COLLECTION');
        }

        console.log('\n' + '='.repeat(60));
        console.log('DIAGNOSIS:');
        console.log('='.repeat(60));

        if (!user && pendingUser) {
            console.log('⚠️  User has NOT verified their email yet');
            console.log('   They are still in PendingUser collection');
            console.log('   They need to verify email before they can login');
            console.log(`   Approval status in PendingUser: ${pendingUser.mentorApprovalStatus}`);
        } else if (user && !pendingUser) {
            console.log('✅ User has verified their email');
            console.log('   They are in User collection');
            if (user.mentorApprovalStatus === 'pending') {
                console.log('   ⚠️  But mentorApprovalStatus is still PENDING');
                console.log('   Admin needs to approve them');
            } else if (user.mentorApprovalStatus === 'approved') {
                console.log('   ✅ mentorApprovalStatus is APPROVED');
                console.log('   They should be able to login');
            } else if (user.mentorApprovalStatus === 'rejected') {
                console.log('   ❌ mentorApprovalStatus is REJECTED');
                console.log('   They cannot login');
            }
        } else if (user && pendingUser) {
            console.log('⚠️  User exists in BOTH collections (unusual)');
            console.log('   This might indicate an issue with the verification process');
        } else {
            console.log('❌ User not found in either collection');
            console.log('   They need to register first');
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkMentorStatus();
