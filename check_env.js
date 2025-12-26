const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    const googleVars = {};

    lines.forEach(line => {
        const match = line.match(/^\s*(GOOGLE_[A-Z_]+)\s*=\s*(.*)$/);
        if (match) {
            googleVars[match[1]] = match[2].trim();
        }
    });

    let report = '--- Google Environment Variables Check ---\n';
    ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'GOOGLE_PROJECT_ID', 'GOOGLE_MEET_CREDENTIAL_FILE'].forEach(key => {
        const val = googleVars[key];
        if (val) {
            report += `${key}: Present (Value: ${val.length > 5 ? val.substring(0, 5) + '...' : val})\n`;
        } else {
            report += `${key}: MISSING\n`;
        }
    });
    report += '------------------------------------------\n';
    fs.writeFileSync('env_report.txt', report);
} catch (e) {
    console.error('Error reading .env:', e.message);
}
