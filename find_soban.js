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

async function findSobanData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const searchName = 'Soban Ahsan';
        const firstName = 'Soban';
        const lastName = 'Ahsan';

        const users = await User.find({
            $or: [
                { 'profile.firstName': new RegExp(firstName, 'i'), 'profile.lastName': new RegExp(lastName, 'i') },
                { email: /soban/i }
            ]
        });

        if (users.length === 0) {
            console.log('❌ No users found with name "Soban Ahsan" or email containing "soban".');
            await mongoose.disconnect();
            return;
        }

        for (const user of users) {
            console.log(`\n--- Found User: ${user.profile.firstName} ${user.profile.lastName} (${user.email}) ---`);
            console.log(`ID: ${user._id}`);
            console.log(`Role: ${user.role}`);

            const profile = await MentorProfile.findOne({ userId: user._id });
            console.log(`Mentor Profile: ${profile ? 'Found (' + profile._id + ')' : 'Not Found'}`);

            const services = await MentorService.find({ mentorId: user._id });
            console.log(`Services: ${services.length} found`);
            services.forEach(s => console.log(`  - ${s.title} (${s._id})`));

            const bookings = await Booking.find({ $or: [{ mentorId: user._id }, { menteeId: user._id }] });
            console.log(`Bookings: ${bookings.length} found`);

            const meetings = await Meeting.find({ $or: [{ mentorId: user._id }, { menteeId: user._id }] });
            console.log(`Meetings: ${meetings.length} found`);

            const payments = await Payment.find({ $or: [{ mentorId: user._id }, { menteeId: user._id }] });
            console.log(`Payments: ${payments.length} found`);

            const notifications = await Notification.find({ userId: user._id });
            console.log(`Notifications: ${notifications.length} found`);

            const conversations = await Conversation.find({ participants: user._id });
            console.log(`Conversations: ${conversations.length} found`);

            const messages = await Message.find({ sender: user._id });
            console.log(`Messages Sent: ${messages.length} found`);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
    }
}

findSobanData();
