/**
 * Database Index Creation Script
 * 
 * This script creates all necessary indexes for optimal query performance.
 * Run this script on your production MongoDB database during low-traffic hours.
 * 
 * Usage:
 * 1. Connect to your MongoDB instance
 * 2. Run: node scripts/createIndexes.js
 * 
 * Or manually execute the commands in MongoDB shell.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const createIndexes = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        console.log('✅ Connected to MongoDB');
        const db = mongoose.connection.db;

        // ============================================
        // MentorProfile Indexes
        // ============================================
        console.log('\n📊 Creating MentorProfile indexes...');

        const mentorProfilesCollection = db.collection('mentorprofiles');

        // Helper function to safely create index (drop if exists)
        const safeCreateIndex = async (collection, keys, options) => {
            try {
                await collection.createIndex(keys, options);
                console.log(`  ✓ Created index: ${options.name}`);
            } catch (error) {
                if (error.code === 85) { // IndexOptionsConflict
                    console.log(`  ⚠️  Dropping conflicting index: ${options.name}`);
                    try {
                        await collection.dropIndex(options.name);
                        await collection.createIndex(keys, options);
                        console.log(`  ✓ Recreated index: ${options.name}`);
                    } catch (dropError) {
                        console.error(`  ❌ Failed to recreate ${options.name}:`, dropError.message);
                    }
                } else if (error.code === 86) { // IndexKeySpecsConflict
                    console.log(`  ℹ️  Index already exists with different name: ${options.name}`);
                } else {
                    throw error;
                }
            }
        };

        // Composite index for main query filters
        await safeCreateIndex(
            mentorProfilesCollection,
            { isActive: 1, isVerified: 1, rating: -1, totalReviews: -1 },
            { name: 'mentor_active_verified_rating_idx' }
        );

        // Unique index for slug lookups
        await safeCreateIndex(
            mentorProfilesCollection,
            { slug: 1 },
            { unique: true, name: 'mentor_slug_unique_idx' }
        );

        // Index for user ID references
        await safeCreateIndex(
            mentorProfilesCollection,
            { userId: 1 },
            { name: 'mentor_userId_idx' }
        );

        // Index for specialization filtering
        await safeCreateIndex(
            mentorProfilesCollection,
            { specializations: 1 },
            { name: 'mentor_specializations_idx' }
        );

        // ============================================
        // Service (MentorService) Indexes
        // ============================================
        console.log('\n📊 Creating Service indexes...');

        const servicesCollection = db.collection('services');

        // Composite index for main query filters
        await safeCreateIndex(
            servicesCollection,
            { status: 1, isActive: 1, rating: -1, totalReviews: -1 },
            { name: 'service_status_active_rating_idx' }
        );

        // Index for mentor lookups
        await safeCreateIndex(
            servicesCollection,
            { mentorId: 1, status: 1, isActive: 1 },
            { name: 'service_mentor_status_idx' }
        );

        // Index for category filtering
        await safeCreateIndex(
            servicesCollection,
            { category: 1, status: 1, isActive: 1 },
            { name: 'service_category_status_idx' }
        );

        // Unique index for slug lookups
        await safeCreateIndex(
            servicesCollection,
            { slug: 1 },
            { unique: true, name: 'service_slug_unique_idx' }
        );

        // Text index for search functionality
        await safeCreateIndex(
            servicesCollection,
            { title: 'text', description: 'text', category: 'text' },
            { name: 'service_text_search_idx', weights: { title: 10, category: 5, description: 1 } }
        );

        // Index for tag-based filtering
        await safeCreateIndex(
            servicesCollection,
            { tags: 1, status: 1, isActive: 1 },
            { name: 'service_tags_status_idx' }
        );

        // Index for price range queries
        await safeCreateIndex(
            servicesCollection,
            { 'packages.price': 1 },
            { name: 'service_price_idx' }
        );

        // ============================================
        // Verify Indexes
        // ============================================
        console.log('\n🔍 Verifying indexes...');

        const mentorIndexes = await mentorProfilesCollection.indexes();
        const serviceIndexes = await servicesCollection.indexes();

        console.log(`\n  MentorProfile indexes: ${mentorIndexes.length}`);
        console.log(`  Service indexes: ${serviceIndexes.length}`);

        // ============================================
        // Index Statistics
        // ============================================
        console.log('\n📈 Index Statistics:');

        const mentorStats = await db.command({ collStats: 'mentorprofiles' });
        const serviceStats = await db.command({ collStats: 'services' });

        console.log(`\n  MentorProfile Collection:`);
        console.log(`    Documents: ${mentorStats.count}`);
        console.log(`    Total Size: ${(mentorStats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`    Index Size: ${(mentorStats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

        console.log(`\n  Service Collection:`);
        console.log(`    Documents: ${serviceStats.count}`);
        console.log(`    Total Size: ${(serviceStats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`    Index Size: ${(serviceStats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

        console.log('\n✅ All indexes created successfully!');
        console.log('\n⚠️  IMPORTANT: Monitor your application performance over the next 24-48 hours.');
        console.log('   Use MongoDB Atlas dashboard → Performance Advisor to check slow queries');

    } catch (error) {
        console.error('❌ Error creating indexes:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Run the script
createIndexes();
