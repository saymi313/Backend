const app = require('../app');
const connectDB = require('../src/shared/config/database');

// Connect to database when the serverless function is initialized
// This connection will be reused across invocations
let dbConnected = false;

const connectDatabase = async () => {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
    } catch (error) {
      console.error('Database connection error in serverless function:', error);
      // Don't throw - allow the function to continue
    }
  }
};

// Initialize database connection
connectDatabase();

// For Vercel serverless functions, we export the app directly
// Vercel will handle the server creation
module.exports = app;

