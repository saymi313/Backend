const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

const Payment = require('./src/shared/models/Payment');

async function checkAndFixPayments() {
    try {
        console.log('\n🔍 Checking payment amounts...\n');

        // Find all payments
        const payments = await Payment.find({}).lean();

        console.log(`Found ${payments.length} total payments\n`);

        // Check for incorrectly stored amounts (amounts that look like they're in dollars instead of cents)
        const incorrectPayments = payments.filter(p => {
            // If amount is less than 1000 (less than $10), it's likely stored as dollars instead of cents
            // Stripe amounts should always be in cents
            return p.amount > 0 && p.amount < 1000;
        });

        if (incorrectPayments.length === 0) {
            console.log('✅ All payments have correct cent-based amounts');
            process.exit(0);
        }

        console.log(`⚠️  Found ${incorrectPayments.length} payments with potentially incorrect amounts:\n`);

        for (const payment of incorrectPayments) {
            console.log(`Payment ID: ${payment._id}`);
            console.log(`  Status: ${payment.status}`);
            console.log(`  Amount: ${payment.amount} (should be ${payment.amount * 100})`);
            console.log(`  MentorAmount: ${payment.mentorAmount} (should be ${payment.mentorAmount * 100})`);
            console.log(`  PlatformFee: ${payment.platformFee} (should be ${payment.platformFee * 100})`);
            console.log(`  Created: ${payment.createdAt}`);
            console.log('');
        }

        // Ask for confirmation before fixing
        console.log('\n⚠️  WARNING: These payments appear to be stored in dollars instead of cents.');
        console.log('To fix this, uncomment the fix section in the script and run again.\n');

        // UNCOMMENT THIS SECTION TO FIX THE PAYMENTS
        /*
        console.log('\n🔧 Fixing payment amounts (multiplying by 100)...\n');
        
        for (const payment of incorrectPayments) {
          await Payment.updateOne(
            { _id: payment._id },
            {
              $set: {
                amount: payment.amount * 100,
                mentorAmount: payment.mentorAmount * 100,
                platformFee: payment.platformFee * 100
              }
            }
          );
          console.log(`✅ Fixed payment ${payment._id}`);
        }
        
        console.log('\n✅ All payments have been corrected!\n');
        */

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAndFixPayments();
