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

async function fixPaymentAmounts() {
    try {
        console.log('\n🔍 Checking payment amounts...\n');

        // Find all payments with amounts less than 1000 (likely stored in dollars instead of cents)
        const incorrectPayments = await Payment.find({
            amount: { $gt: 0, $lt: 1000 }
        }).lean();

        if (incorrectPayments.length === 0) {
            console.log('✅ All payments have correct cent-based amounts');
            console.log('No fixes needed!\n');
            process.exit(0);
        }

        console.log(`⚠️  Found ${incorrectPayments.length} payment(s) with incorrect amounts:\n`);

        for (const payment of incorrectPayments) {
            console.log(`Payment ID: ${payment._id}`);
            console.log(`  Current: amount=${payment.amount}, mentorAmount=${payment.mentorAmount}, platformFee=${payment.platformFee}`);
            console.log(`  Will fix to: amount=${payment.amount * 100}, mentorAmount=${payment.mentorAmount * 100}, platformFee=${payment.platformFee * 100}`);
            console.log('');
        }

        console.log('🔧 Fixing payment amounts (converting to cents)...\n');

        let fixedCount = 0;
        for (const payment of incorrectPayments) {
            const result = await Payment.updateOne(
                { _id: payment._id },
                {
                    $set: {
                        amount: payment.amount * 100,
                        mentorAmount: payment.mentorAmount * 100,
                        platformFee: payment.platformFee * 100
                    }
                }
            );

            if (result.modifiedCount > 0) {
                console.log(`✅ Fixed payment ${payment._id}`);
                fixedCount++;
            }
        }

        console.log(`\n✅ Successfully fixed ${fixedCount} payment(s)!`);
        console.log('Your dashboard should now show correct amounts (e.g., $108.00 instead of $1.08)\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixPaymentAmounts();
