require('dotenv').config();
const emailService = require('./src/shared/services/emailService');

console.log('\n🧪 ===== TESTING EMAIL SERVICE =====\n');

// Test email configuration
async function testEmailService() {
    try {
        console.log('📧 Testing email verification...');
        const result = await emailService.verifyEmailConfig();

        if (result.success) {
            console.log('✅ Email configuration is valid and SMTP connection works!');
            console.log('\n📤 Attempting to send a test verification email...');

            // Generate a test OTP
            const testOTP = '123456';
            const testEmail = process.env.EMAIL_USER; // Send to yourself for testing

            console.log(`   Sending to: ${testEmail}`);
            console.log(`   OTP: ${testOTP}`);

            const sendResult = await emailService.sendVerificationEmail(testEmail, testOTP);

            if (sendResult.success) {
                console.log('\n✅ TEST EMAIL SENT SUCCESSFULLY!');
                console.log(`📬 Message ID: ${sendResult.messageId}`);
                console.log('\n💡 Check your inbox to confirm the email arrived.');
                console.log('   If you received it, the email service is working correctly.');
            } else {
                console.log('\n❌ Failed to send test email');
                console.log(`Error: ${sendResult.error}`);
            }
        } else {
            console.log('❌ Email configuration failed');
            console.log(`Error: ${result.error}`);
            console.log('\n💡 Possible issues:');
            console.log('   - Check your EMAIL_USER and EMAIL_PASS in .env');
            console.log('   - Verify EMAIL_HOST and EMAIL_PORT are correct');
            console.log('   - For Gmail: use App Password if 2FA is enabled');
        }
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error(error);
    }

    console.log('\n=====================================\n');
}

testEmailService();
