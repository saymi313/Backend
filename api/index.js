// Wrap everything in try-catch to handle initialization errors
let initError = null;
let app = null;

try {
  const { validateEnvironment } = require('../src/shared/config/environment');

  // Validate environment variables for serverless deployment
  try {
    validateEnvironment();
    console.log('✅ Environment validation passed for serverless function');
  } catch (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }

  // Only load app if validation passed
  app = require('../app');
  console.log('✅ App loaded successfully');
  
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

} catch (error) {
  initError = error;
  console.error('❌ Serverless function initialization failed:', error);
  console.error('Stack:', error.stack);
}

// Export error handler if initialization failed, otherwise export app
if (initError || !app) {
  module.exports = (req, res) => {
    res.status(500).json({
      success: false,
      message: 'Server initialization error',
      error: initError ? initError.message : 'Failed to load application',
      stack: process.env.NODE_ENV === 'development' ? initError?.stack : undefined
    });
  };
} else {
  // For Vercel serverless functions, we export the app directly
  // Vercel will handle the server creation
  module.exports = app;
}

