// Wrap everything in try-catch to handle initialization errors
let initError = null;
let app = null;
let wrappedApp = null;

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
  const mongoose = require('mongoose');

  // Connect to database immediately (connection will be reused across invocations)
  let dbConnectionPromise = null;
  
  const ensureDBConnection = async () => {
    // If already connected, return immediately
    if (mongoose.connection.readyState === 1) {
      return;
    }
    
    // If connection is in progress, wait for it
    if (dbConnectionPromise) {
      return dbConnectionPromise;
    }
    
    // Start new connection
    dbConnectionPromise = connectDB()
      .then(() => {
        console.log('✅ Database connected in serverless function');
      })
      .catch((error) => {
        console.error('❌ Database connection error:', error.message);
        dbConnectionPromise = null; // Reset so it can retry
        throw error;
      });
    
    return dbConnectionPromise;
  };

  // Start connecting immediately (don't wait for first request)
  ensureDBConnection().catch(err => {
    console.error('Initial DB connection failed:', err.message);
  });

  // Wrap the app to ensure DB is connected before handling requests
  wrappedApp = async (req, res) => {
    try {
      // Ensure database is connected before processing request
      await ensureDBConnection();
      // Handle the request with the app
      return app(req, res);
    } catch (error) {
      console.error('Request handler error:', error);
      return res.status(503).json({
        success: false,
        message: 'Database connection failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Service temporarily unavailable'
      });
    }
  };

} catch (error) {
  initError = error;
  console.error('❌ Serverless function initialization failed:', error);
  console.error('Stack:', error.stack);
}

// Export error handler if initialization failed, otherwise export wrapped app
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
  // Export the wrapped app that ensures DB connection
  module.exports = wrappedApp;
}

