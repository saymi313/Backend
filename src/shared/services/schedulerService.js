const { checkUpcomingMeetingReminders } = require('../../MentorPanel/services/notificationService');

/**
 * Start all scheduled jobs
 * This runs periodic tasks like checking for meeting reminders
 */
const startScheduledJobs = () => {
  console.log('🕐 Starting scheduled jobs...');

  // Check for meeting reminders every hour
  setInterval(async () => {
    try {
      console.log('⏰ Running scheduled meeting reminder check...');
      await checkUpcomingMeetingReminders();
    } catch (error) {
      console.error('❌ Error in scheduled meeting reminder check:', error);
    }
  }, 60 * 60 * 1000); // Run every hour (60 minutes * 60 seconds * 1000 milliseconds)

  // Also run immediately on startup
  setTimeout(async () => {
    try {
      console.log('⏰ Running initial meeting reminder check...');
      await checkUpcomingMeetingReminders();
    } catch (error) {
      console.error('❌ Error in initial meeting reminder check:', error);
    }
  }, 5000); // Run 5 seconds after server starts (to ensure DB is connected)

  console.log('✅ Scheduled jobs started successfully');
};

module.exports = {
  startScheduledJobs
};

