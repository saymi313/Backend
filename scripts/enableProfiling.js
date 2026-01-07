/**
 * Query Profiling Setup Script
 * 
 * This script enables MongoDB query profiling to monitor slow queries in production.
 * 
 * Usage:
 *   node scripts/enableProfiling.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const enableProfiling = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log('✅ Connected to MongoDB');
        const db = mongoose.connection.db;

        // Enable profiling
        // Level 1: Log slow operations (>100ms)
        // Level 2: Log all operations (not recommended for production)
        await db.command({ profile: 1, slowms: 100 });

        console.log('✅ Query profiling enabled');
        console.log('   Logging queries slower than 100ms');
        console.log('\nTo view slow queries, run:');
        console.log('   db.system.profile.find().sort({ ts: -1 }).limit(10).pretty()');

        // Get current profiling status
        const status = await db.command({ profile: -1 });
        console.log('\nCurrent profiling status:', status);

    } catch (error) {
        console.error('❌ Error enabling profiling:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

enableProfiling();
