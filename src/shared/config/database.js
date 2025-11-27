const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Check if MONGODB_URI is provided
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      console.error('Please set MONGODB_URI in your .env file');
      return;
    }

    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('🔐 Authentication failed. Please check:');
      console.error('   - Username and password in connection string');
      console.error('   - Database user permissions in MongoDB Atlas');
      console.error('   - IP whitelist in MongoDB Atlas');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('🌐 Network error. Please check:');
      console.error('   - Internet connection');
      console.error('   - MongoDB Atlas cluster status');
      console.error('   - Connection string format');
    }
    
    console.error('⚠️  Server will run but database operations will fail');
    console.error('💡 For development, you can use MongoDB Compass or a local MongoDB instance');
  }
};

module.exports = connectDB;
