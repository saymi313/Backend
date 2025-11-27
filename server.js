const app = require('./app');
const connectDB = require('./src/shared/config/database');
const { initializeSocket } = require('./src/shared/config/socket');
const { initializeSocketHandlers } = require('./src/shared/services/socketHandlers');
const { startScheduledJobs } = require('./src/shared/services/schedulerService');

const PORT = process.env.PORT || 5000;

// Start server first
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Initialize Socket.IO
const io = initializeSocket(server);
initializeSocketHandlers(io);

// Connect to database after server starts
connectDB().then(() => {
  // Start scheduled jobs after database connection
  startScheduledJobs();
  console.log('✅ Scheduled jobs started');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`Error: ${err.message}`);
  process.exit(1);
});

module.exports = server;
