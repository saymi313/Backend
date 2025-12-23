require('dotenv').config();
const mongoose = require('mongoose');

async function fixMentorPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const User = require('./src/shared/models/User');
        const email = 'saymiusa313@gmail.com';
        const newPassword = 'Test123456';

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user) {
            console.log('❌ User not found');
            await mongoose.disconnect();
            return;
        }

        console.log('✅ Found user:', user.email);
        console.log('   Current password hash:', user.password);

        // Set the password directly - the pre-save hook will hash it
        user.password = newPassword;

        // Save - this will trigger the pre-save hook to hash the password
        await user.save();

        console.log('\n' + '='.repeat(60));
        console.log('✅ PASSWORD UPDATED SUCCESSFULLY!');
        console.log('='.repeat(60));
        console.log('📧 Email:', email);
        console.log('🔑 Password:', newPassword);
        console.log('='.repeat(60));

        // Verify the password works
        const isValid = await user.comparePassword(newPassword);
        console.log('\n🔍 Verification test:');
        console.log('   Password comparison result:', isValid);

        if (isValid) {
            console.log('   ✅ Password is working correctly!');
        } else {
            console.log('   ❌ Password verification failed!');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

fixMentorPassword();
