require('dotenv').config();
const mongoose = require('mongoose');

async function deleteAllMentorServices() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const Service = require('./src/MentorPanel/models/Service');

        // Count services before deletion
        const count = await Service.countDocuments();
        console.log(`📊 Found ${count} mentor services in database\n`);

        if (count === 0) {
            console.log('✅ No services to delete');
            await mongoose.disconnect();
            return;
        }

        // Delete all services
        const result = await Service.deleteMany({});

        console.log('='.repeat(60));
        console.log('✅ ALL MENTOR SERVICES DELETED');
        console.log('='.repeat(60));
        console.log(`🗑️  Deleted ${result.deletedCount} services`);
        console.log('='.repeat(60));

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

deleteAllMentorServices();
