const bcrypt = require('bcryptjs');

const storedHash = '$2b$10$sghQ6uGNXBukWq6Gq902/.L5k8ETblfvBcAa3SRp.ndgSdzVAdD/G';
const password = 'usalegend313';

bcrypt.compare(password, storedHash).then(result => {
    console.log('\n🔍 Password Verification Test');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email: saeed.usairam@gmail.com');
    console.log('Password:', password);
    console.log('Stored Hash:', storedHash);
    console.log('Match:', result ? '✅ YES' : '❌ NO');
    if (!result) {
        console.log('\n⚠️  PASSWORD DOES NOT MATCH!');
        console.log('The password in the database is different from what you provided.');
    } else {
        console.log('\n✅ Password is correct!');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
