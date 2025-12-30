const mongoose = require('mongoose');

// Test cases
const testCases = [
    'soban-ahsan',
    '694648f028e33df936f67f8f',
    'another-slug-test',
    '507f1f77bcf86cd799439011'
];

console.log('=== mongoose.Types.ObjectId.isValid() ===');
testCases.forEach(id => {
    console.log(`${id}: ${mongoose.Types.ObjectId.isValid(id)}`);
});

console.log('\n=== Regex /^[0-9a-fA-F]{24}$/ ===');
testCases.forEach(id => {
    console.log(`${id}: ${/^[0-9a-fA-F]{24}$/.test(id)}`);
});
