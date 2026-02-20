require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/shared/models/User');
const MentorProfile = require('./src/MentorPanel/models/MentorProfile');
const MentorService = require('./src/MentorPanel/models/Service');
const Booking = require('./src/shared/models/Booking');
const Meeting = require('./src/shared/models/Meeting');
const Payment = require('./src/shared/models/Payment');
const Notification = require('./src/shared/models/Notification');
const Conversation = require('./src/shared/models/Conversation');
const Message = require('./src/shared/models/Message');

async function deleteSobanData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const userId = '6945933f8ae8ff4516363150';
        const userEmail = 'saymiusa313@gmail.com';

        // 1. Double check the user exists
        const user = await User.findById(userId);
        if (!user || user.email !== userEmail) {
            console.error('❌ User not found or email mismatch. Safety check failed.');
            console.log('Provided ID:', userId);
            console.log('Found User:', user ? user.email : 'None');
            await mongoose.disconnect();
            return;
        }

        console.log(`⚠️ STARTING DELETION FOR: ${user.profile.firstName} ${user.profile.lastName} (${user.email})`);
        console.log('--------------------------------------------------');

        // 2. Delete Mentor Profile
        const profileDel = await MentorProfile.deleteMany({ userId });
        console.log(`- Deleted Mentor Profile: ${profileDel.deletedCount}`);

        // 3. Delete Services
        const serviceDel = await MentorService.deleteMany({ mentorId: userId });
        console.log(`- Deleted Services: ${serviceDel.deletedCount}`);

        // 4. Delete Bookings (where user is mentor or mentee)
        const bookingDel = await Booking.deleteMany({ $or: [{ mentorId: userId }, { menteeId: userId }] });
        console.log(`- Deleted Bookings: ${bookingDel.deletedCount}`);

        // 5. Delete Meetings (where user is mentor or mentee)
        const meetingDel = await Meeting.deleteMany({ $or: [{ mentorId: userId }, { menteeId: userId }] });
        console.log(`- Deleted Meetings: ${meetingDel.deletedCount}`);

        // 6. Delete Payments (where user is mentor or mentee)
        const paymentDel = await Payment.deleteMany({ $or: [{ mentorId: userId }, { menteeId: userId }] });
        console.log(`- Deleted Payments: ${paymentDel.deletedCount}`);

        // 7. Delete Notifications
        const notifDel = await Notification.deleteMany({ userId });
        console.log(`- Deleted Notifications: ${notifDel.deletedCount}`);

        // 8. Delete Messages Sent by the user
        const messageDel = await Message.deleteMany({ sender: userId });
        console.log(`- Deleted Messages Sent: ${messageDel.deletedCount}`);

        // 9. Handle Conversations
        // Note: We delete conversations where the user was a participant. 
        // This might leave "ghost" conversations for other participants if not handled carefully, 
        // but since we are deleting the whole account, this is the standard approach.
        const convDel = await Conversation.deleteMany({ participants: userId });
        console.log(`- Deleted Conversations: ${convDel.deletedCount}`);

        // 10. Delete the User Account itself
        const userDel = await User.findByIdAndDelete(userId);
        console.log(`- Deleted User Account: ${userDel ? 'SUCCESS' : 'FAILED'}`);

        console.log('--------------------------------------------------');
        console.log('✅ ALL DATA DELETED SUCCESSFULLY');

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error during deletion:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

deleteSobanData();
