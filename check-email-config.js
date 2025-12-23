require('dotenv').config();

console.log('\n🔍 ===== EMAIL CONFIGURATION DIAGNOSTIC =====\n');

const requiredVars = [
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_FROM'
];

let hasIssues = false;
let missingVars = [];

requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
        console.log(`❌ ${varName}: NOT SET`);
        hasIssues = true;
        missingVars.push(varName);
    } else {
        // Mask sensitive values
        if (varName === 'EMAIL_PASS') {
            console.log(`✅ ${varName}: ${'*'.repeat(value.length)} (${value.length} chars)`);
        } else {
            console.log(`✅ ${varName}: ${value}`);
        }
    }
});

console.log('\n📊 Summary:');
if (hasIssues) {
    console.log('❌ Email configuration is INCOMPLETE');
    console.log(`\n🚫 Missing variables: ${missingVars.join(', ')}`);
    console.log('\n💡 Required environment variables in .env file:');
    console.log('   EMAIL_HOST=smtp.hostinger.com (or smtp.gmail.com)');
    console.log('   EMAIL_PORT=587 (for TLS) or 465 (for SSL)');
    console.log('   EMAIL_USER=your-email@example.com');
    console.log('   EMAIL_PASS=your-password-or-app-password');
    console.log('   EMAIL_FROM=your-email@example.com (optional)');
    console.log('\n⚠️  This is why OTP emails are NOT being sent!');
} else {
    console.log('✅ All required email variables are set');
    console.log('📧 Configuration looks complete');
}

console.log('\n============================================\n');
