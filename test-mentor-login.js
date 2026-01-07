const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

const User = require('./src/shared/models/User');
const { USER_ROLES } = require('./src/shared/utils/constants/roles');
const bcrypt = require('bcryptjs');

async function testMentorLogin() {
    try {
        const testEmail = 'saeed.usairam@gmail.com';
        const testPassword = 'usalegend313'; // Actual password provided by user

        console.log('\n🔍 Testing mentor login for:', testEmail);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Step 1: Find user with mentor role
        console.log('Step 1: Finding user with mentor role...');
        const user = await User.findOne({
            email: testEmail,
            role: USER_ROLES.MENTOR
        }).select('+password');

        if (!user) {
            console.log('❌ ISSUE FOUND: User not found with mentor role');

            // Check if user exists with different role
            const anyUser = await User.findOne({ email: testEmail });
            if (anyUser) {
                console.log(`⚠️  User exists but with role: "${anyUser.role}"`);
                console.log('   Full user data:', JSON.stringify(anyUser, null, 2));
            } else {
                console.log('❌ User does not exist in User collection at all');

                // Check PendingUser collection
                const PendingUser = require('./src/shared/models/PendingUser');
                const pendingUser = await PendingUser.findOne({ email: testEmail });
                if (pendingUser) {
                    console.log('⚠️  User found in PendingUser collection:');
                    console.log(JSON.stringify(pendingUser, null, 2));
                }
            }
            process.exit(0);
        }

        console.log('✅ User found!');
        console.log('   Email:', user.email);
        console.log('   Role:', user.role);
        console.log('   Has password:', !!user.password);
        console.log('   Password hash:', user.password ? user.password.substring(0, 20) + '...' : 'NONE');

        // Step 2: Check isActive
        console.log('\nStep 2: Checking isActive...');
        if (!user.isActive) {
            console.log('❌ ISSUE FOUND: Account is deactivated');
            console.log('   isActive:', user.isActive);
            process.exit(0);
        }
        console.log('✅ isActive:', user.isActive);

        // Step 3: Check isVerified
        console.log('\nStep 3: Checking isVerified...');
        console.log('   isVerified:', user.isVerified);
        if (!user.isVerified) {
            console.log('⚠️  Note: User is not verified, but login code doesn\'t check this');
        }

        // Step 4: Check mentorApprovalStatus
        console.log('\nStep 4: Checking mentorApprovalStatus...');
        if (user.mentorApprovalStatus === 'pending') {
            console.log('❌ ISSUE FOUND: Account pending approval');
            console.log('   mentorApprovalStatus:', user.mentorApprovalStatus);
            process.exit(0);
        }
        if (user.mentorApprovalStatus === 'rejected') {
            console.log('❌ ISSUE FOUND: Account rejected');
            console.log('   mentorApprovalStatus:', user.mentorApprovalStatus);
            process.exit(0);
        }
        console.log('✅ mentorApprovalStatus:', user.mentorApprovalStatus);

        // Step 5: Check isLoginPaused
        console.log('\nStep 5: Checking isLoginPaused...');
        if (user.isLoginPaused) {
            console.log('❌ ISSUE FOUND: Login is paused');
            console.log('   isLoginPaused:', user.isLoginPaused);
            process.exit(0);
        }
        console.log('✅ isLoginPaused:', user.isLoginPaused);

        // Step 6: Check password
        console.log('\nStep 6: Checking password...');
        if (!user.password) {
            console.log('❌ ISSUE FOUND: No password hash stored for this user!');
            console.log('   This likely means the user was created via Google OAuth');
            console.log('   or password was not properly saved during migration');
            process.exit(0);
        }

        // Test password comparison
        const isPasswordValid = await user.comparePassword(testPassword);
        if (!isPasswordValid) {
            console.log('❌ ISSUE FOUND: Password does not match');
            console.log('   You entered the wrong test password, or user\'s actual password is different');
            console.log('   Stored hash:', user.password);
            process.exit(0);
        }
        console.log('✅ Password matches!');

        // Step 7: Summary
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ ALL CHECKS PASSED! Login should work.');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('If login still fails, the issue is likely:');
        console.log('1. Frontend is calling wrong API endpoint');
        console.log('2. CORS or network issues');
        console.log('3. JWT token generation issues');
        console.log('4. Check browser console for actual error message\n');

    } catch (error) {
        console.error('❌ Error during test:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

testMentorLogin();
