const Meeting = require('../../shared/models/Meeting');
const Notification = require('../../shared/models/Notification');
const User = require('../../shared/models/User');
const { emitToUser } = require('../../shared/config/socket');

/**
 * Check for upcoming meetings within 24 hours and create reminder notifications
 * This should be called periodically (e.g., every hour)
 */
const checkUpcomingMeetingReminders = async () => {
  try {
    console.log('🔔 Checking for upcoming meeting reminders...');
    
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Find meetings scheduled within the next 24 hours
    const upcomingMeetings = await Meeting.find({
      status: { $in: ['scheduled', 'in-progress'] },
      scheduledDate: {
        $gte: now,
        $lte: in24Hours
      }
    })
      .populate('mentorId', 'profile.firstName profile.lastName email')
      .populate('menteeId', 'profile.firstName profile.lastName email')
      .lean();

    console.log(`📅 Found ${upcomingMeetings.length} upcoming meetings in next 24 hours`);

    const notificationsCreated = [];

    for (const meeting of upcomingMeetings) {
      try {
        // Check if reminder notification already exists for this meeting
        const existingNotification = await Notification.findOne({
          userId: { $in: [meeting.mentorId._id, meeting.menteeId._id] },
          type: 'meeting_reminder',
          'data.meetingId': meeting._id,
          isRead: false,
          isActive: true
        });

        if (existingNotification) {
          console.log(`⏭️  Reminder notification already exists for meeting ${meeting._id}`);
          continue;
        }

        // Calculate time until meeting
        const meetingDate = new Date(meeting.scheduledDate);
        const timeUntilMeeting = meetingDate.getTime() - now.getTime();
        const hoursUntilMeeting = Math.floor(timeUntilMeeting / (1000 * 60 * 60));
        const minutesUntilMeeting = Math.floor((timeUntilMeeting % (1000 * 60 * 60)) / (1000 * 60));

        let timeString = '';
        if (hoursUntilMeeting > 0) {
          timeString = `${hoursUntilMeeting} hour${hoursUntilMeeting > 1 ? 's' : ''}`;
        } else if (minutesUntilMeeting > 0) {
          timeString = `${minutesUntilMeeting} minute${minutesUntilMeeting > 1 ? 's' : ''}`;
        } else {
          timeString = 'soon';
        }

        // Create notification for mentor
        const mentorNotification = await Notification.create({
          userId: meeting.mentorId._id,
          type: 'meeting_reminder',
          title: `Upcoming Meeting in ${timeString}`,
          message: `Meeting "${meeting.title}" with ${meeting.menteeId.profile?.firstName || meeting.menteeId.email} is scheduled in ${timeString}`,
          data: {
            meetingId: meeting._id,
            bookingId: meeting.bookingId || null,
            menteeId: meeting.menteeId._id,
            scheduledDate: meeting.scheduledDate,
            meetingLink: meeting.meetingLink
          },
          priority: hoursUntilMeeting < 1 ? 'urgent' : hoursUntilMeeting < 12 ? 'high' : 'medium',
          actionUrl: '/mentor/meetings',
          actionText: 'View Meeting',
          expiresAt: new Date(meetingDate.getTime() + 60 * 60 * 1000) // Expire 1 hour after meeting
        });

        notificationsCreated.push({
          userId: meeting.mentorId._id,
          notificationId: mentorNotification._id,
          meetingId: meeting._id
        });

        console.log(`✅ Created reminder notification for mentor ${meeting.mentorId._id} for meeting ${meeting._id}`);

        // Emit notification via socket to mentor if online
        try {
          const notificationEmitted = emitToUser(meeting.mentorId._id.toString(), 'notification:new', {
            notification: mentorNotification.toJSON()
          });
          console.log(`🔔 Meeting reminder notification emitted to mentor: ${notificationEmitted ? 'YES' : 'NO (offline)'}`);
        } catch (socketError) {
          console.warn('⚠️ Error emitting meeting reminder notification via socket:', socketError);
        }

        // Create notification for mentee (optional - you may want to skip this)
        // Uncomment if you want mentees to also receive reminders
        /*
        const menteeNotification = await Notification.create({
          userId: meeting.menteeId._id,
          type: 'meeting_reminder',
          title: `Upcoming Meeting in ${timeString}`,
          message: `Meeting "${meeting.title}" with your mentor is scheduled in ${timeString}`,
          data: {
            meetingId: meeting._id,
            bookingId: meeting.bookingId || null,
            mentorId: meeting.mentorId._id,
            scheduledDate: meeting.scheduledDate,
            meetingLink: meeting.meetingLink
          },
          priority: hoursUntilMeeting < 1 ? 'urgent' : hoursUntilMeeting < 12 ? 'high' : 'medium',
          actionUrl: '/mentees/meetings',
          actionText: 'Join Meeting',
          expiresAt: new Date(meeting.scheduledDate.getTime() + 60 * 60 * 1000)
        });

        notificationsCreated.push({
          userId: meeting.menteeId._id,
          notificationId: menteeNotification._id,
          meetingId: meeting._id
        });
        */

      } catch (error) {
        console.error(`❌ Error creating reminder for meeting ${meeting._id}:`, error);
      }
    }

    console.log(`✅ Created ${notificationsCreated.length} meeting reminder notifications`);
    return { success: true, count: notificationsCreated.length, notifications: notificationsCreated };
  } catch (error) {
    console.error('❌ Error checking upcoming meeting reminders:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Manually trigger meeting reminder check (can be called from API endpoint)
 */
const triggerMeetingReminderCheck = async (req, res) => {
  try {
    const result = await checkUpcomingMeetingReminders();
    return res.json({
      success: true,
      message: 'Meeting reminder check completed',
      data: result
    });
  } catch (error) {
    console.error('Error triggering meeting reminder check:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to trigger meeting reminder check',
      error: error.message
    });
  }
};

module.exports = {
  checkUpcomingMeetingReminders,
  triggerMeetingReminderCheck
};

