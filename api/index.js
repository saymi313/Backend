const app = require('../app');
const connectDB = require('../src/shared/config/database');

// Track database connection state
let dbConnected = false;
let connectionPromise = null;

const connectDatabase = async () => {
  if (dbConnected) {
    return; // Already connected
  }

  if (connectionPromise) {
    return connectionPromise; // Connection in progress, wait for it
  }

  connectionPromise = connectDB()
    .then(() => {
      dbConnected = true;
      console.log('✅ Database connected in serverless function');
      connectionPromise = null;
    })
    .catch((error) => {
      console.error('❌ Database connection error in serverless function:', error.message);
      connectionPromise = null;
      throw error; // Fail the function if DB can't connect
    });

  return connectionPromise;
};

// Middleware to ensure database is connected before processing requests
app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// For Vercel serverless functions, we export the app directly
// Vercel will handle the server creation
module.exports = app;


