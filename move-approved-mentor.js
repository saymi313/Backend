require('dotenv').config();
const mongoose = require('mongoose');

async function moveApprovedMentorToUserCollection() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const User = require('./src/shared/models/User');
        const PendingUser = require('./src/shared/models/PendingUser');

        const email = 'saymi.usa313@gmail.com'; // The mentor's email

        console.log(`🔍 Looking for mentor: ${email}\n`);

        // Check if already in User collection
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            console.log('✅ Mentor already exists in User collection');
            console.log(`   - mentorApprovalStatus: ${existingUser.mentorApprovalStatus}`);

            if (existingUser.mentorApprovalStatus !== 'approved') {
                console.log('\n🔧 Updating mentor approval status to approved...');
                existingUser.mentorApprovalStatus = 'approved';
                await existingUser.save();
                console.log('✅ Mentor approved successfully!');
            } else {
                console.log('✅ Mentor is already approved');
            }

            await mongoose.disconnect();
            return;
        }

        // Find in PendingUser collection
        const pendingUser = await PendingUser.findOne({ email: email.toLowerCase() }).select('+password');

        if (!pendingUser) {
            console.log('❌ Mentor not found in either collection');
            console.log('   They need to register first');
            await mongoose.disconnect();
            return;
        }

        console.log('✅ Found mentor in PendingUser collection');
        console.log(`   - Role: ${pendingUser.role}`);
        console.log(`   - mentorApprovalStatus: ${pendingUser.mentorApprovalStatus}`);
        console.log(`   - Has password: ${!!pendingUser.password}`);

        // Create user in User collection
        console.log('\n🔧 Moving mentor to User collection...');

        const newUser = await User.create({
            email: pendingUser.email,
            password: pendingUser.password, // Already hashed
            role: pendingUser.role,
            profile: pendingUser.profile,
            isVerified: true, // Mark as verified
            authProvider: 'local',
            mentorApprovalStatus: 'approved', // Set to approved
            isActive: true
        });

        console.log('✅ Mentor created in User collection');
        console.log(`   - ID: ${newUser._id}`);
        console.log(`   - Email: ${newUser.email}`);
        console.log(`   - Role: ${newUser.role}`);
        console.log(`   - isVerified: ${newUser.isVerified}`);
        console.log(`   - mentorApprovalStatus: ${newUser.mentorApprovalStatus}`);

        // Delete from PendingUser collection
        await PendingUser.deleteOne({ _id: pendingUser._id });
        console.log('✅ Removed from PendingUser collection');

        console.log('\n' + '='.repeat(60));
        console.log('✅ SUCCESS! Mentor can now login with their credentials');
        console.log('='.repeat(60));

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

moveApprovedMentorToUserCollection();
