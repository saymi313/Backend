const { validateEnvironment } = require('../src/shared/config/environment');

// Validate environment variables for serverless deployment
let validationError = null;
try {
  validateEnvironment();
  console.log('✅ Environment validation passed for serverless function');
} catch (error) {
  validationError = error;
  console.error('❌ Environment validation failed:', error.message);
}

// If validation failed, export error handler and stop
if (validationError) {
  module.exports = (req, res) => {
    res.status(500).json({
      success: false,
      message: 'Server configuration error',
      error: process.env.NODE_ENV === 'development' ? validationError.message : 'Please check environment variables'
    });
  };
} else {
  // Only load app if validation passed
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
        console.log('✅ Database connected in serverless function');
      } catch (error) {
        console.error('❌ Database connection error in serverless function:', error);
        // Don't throw - allow the function to continue
      }
    }
  };

  // Initialize database connection
  connectDatabase();

  // For Vercel serverless functions, we export the app directly
  // Vercel will handle the server creation
  module.exports = app;
}

