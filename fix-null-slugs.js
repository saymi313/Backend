const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

const MentorProfile = require('./src/MentorPanel/models/MentorProfile');

async function fixNullSlugs() {
    try {
        console.log('\n🔄 Fixing null slugs in mentor profiles...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Find all profiles with null or missing slug
        const profilesWithoutSlug = await MentorProfile.find({
            $or: [
                { slug: null },
                { slug: { $exists: false } }
            ]
        });

        console.log(`Found ${profilesWithoutSlug.length} profiles without slugs\n`);

        if (profilesWithoutSlug.length === 0) {
            console.log('✅ No profiles need fixing!');
            process.exit(0);
        }

        let fixed = 0;
        let failed = 0;

        for (const profile of profilesWithoutSlug) {
            try {
                // Generate slug from userId
                profile.slug = profile.userId.toString();
                await profile.save();
                console.log(`✅ Fixed profile for user: ${profile.userId}`);
                fixed++;
            } catch (error) {
                console.error(`❌ Failed to fix profile for user: ${profile.userId}`, error.message);
                failed++;
            }
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Fixed: ${fixed}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   📝 Total: ${profilesWithoutSlug.length}\n`);

    } catch (error) {
        console.error('❌ Error fixing slugs:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Disconnected from MongoDB\n');
        process.exit(0);
    }
}

fixNullSlugs();
