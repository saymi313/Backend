/**
 * Script to seed Best Seller data for mentor
 * Run with: node src/MentorPanel/scripts/seedBestSellerData.js
 * 
 * This script will:
 * 1. Set mentor profile badge to "Best Seller"
 * 2. Create 55 completed bookings for the mentor
 */

require('dotenv').config();
const mongoose = require('mongoose');
const MentorProfile = require('../models/MentorProfile');
const Booking = require('../../shared/models/Booking');
const User = require('../../shared/models/User');
const MentorService = require('../models/Service');

const MENTOR_USER_ID = '68f39ff9dd5b2684677e80cb'; // usman@gmail.com
const REQUIRED_BOOKINGS = 55; // More than 50 to ensure Best Seller status

async function seedBestSellerData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scholarslee', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find or create mentor profile
    let mentorProfile = await MentorProfile.findOne({ userId: MENTOR_USER_ID });
    
    if (!mentorProfile) {
      console.log('💡 Creating mentor profile...');
      mentorProfile = new MentorProfile({
        userId: MENTOR_USER_ID,
        title: 'Software Engineer',
        bio: 'Experienced mentor with Best Seller badge. Helping students achieve their goals through personalized guidance and mentorship.',
        badge: 'Best Seller'
      });
      await mentorProfile.save();
      console.log('✅ Created mentor profile');
    } else {
      mentorProfile.badge = 'Best Seller';
      await mentorProfile.save();
      console.log('✅ Updated mentor profile badge to: Best Seller');
    }

    // Check existing completed bookings
    const existingCompletedBookings = await Booking.countDocuments({
      mentorId: MENTOR_USER_ID,
      status: 'completed',
      isActive: true
    });

    console.log(`📊 Existing completed bookings: ${existingCompletedBookings}`);

    if (existingCompletedBookings >= REQUIRED_BOOKINGS) {
      console.log(`✅ Mentor already has ${existingCompletedBookings} completed bookings (>= ${REQUIRED_BOOKINGS})`);
    } else {
      const bookingsToCreate = REQUIRED_BOOKINGS - existingCompletedBookings;
      console.log(`📝 Creating ${bookingsToCreate} completed bookings...`);

      // Find or create a dummy mentee user
      let menteeUser = await User.findOne({ email: 'dummy.mentee@test.com' });
      if (!menteeUser) {
        menteeUser = new User({
          email: 'dummy.mentee@test.com',
          password: '$2b$10$dummy', // Dummy password hash
          role: 'mentee',
          profile: {
            firstName: 'Dummy',
            lastName: 'Mentee',
            country: 'Test Country'
          }
        });
        await menteeUser.save();
        console.log('✅ Created dummy mentee user');
      }

      // Find or create a service for the mentor
      let mentorService = await MentorService.findOne({ mentorId: MENTOR_USER_ID });
      if (!mentorService) {
        mentorService = new MentorService({
          mentorId: MENTOR_USER_ID,
          title: 'Software Engineering Mentorship',
          description: 'Comprehensive mentorship program for software engineering',
          category: 'Technology',
          packages: [
            {
              name: 'Basic Package',
              price: 50,
              duration: '60 minutes',
              features: ['1-on-1 session', 'Career guidance'],
              calls: 1
            }
          ],
          status: 'approved',
          isActive: true
        });
        await mentorService.save();
        console.log('✅ Created mentor service');
      }

      // Create completed bookings
      const bookings = [];
      const now = new Date();
      
      for (let i = 0; i < bookingsToCreate; i++) {
        // Create bookings with dates in the past (so they can be completed)
        const pastDate = new Date(now);
        pastDate.setDate(pastDate.getDate() - (bookingsToCreate - i + 10)); // Spread over days, ensure they're in the past
        
        const bookingData = {
          menteeId: menteeUser._id,
          mentorId: MENTOR_USER_ID,
          serviceId: mentorService._id,
          packageId: mentorService.packages[0]._id.toString(),
          status: 'completed',
          scheduledDate: pastDate,
          duration: 60, // 60 minutes
          totalAmount: mentorService.packages[0].price,
          paymentStatus: 'paid',
          completedAt: pastDate,
          isActive: true,
          createdAt: pastDate,
          updatedAt: pastDate
        };
        
        bookings.push(bookingData);
      }

      // Insert all bookings at once using collection directly to bypass pre-save validation
      await Booking.collection.insertMany(bookings);
      console.log(`✅ Created ${bookingsToCreate} completed bookings`);

      // Verify the count
      const finalCount = await Booking.countDocuments({
        mentorId: MENTOR_USER_ID,
        status: 'completed',
        isActive: true
      });
      console.log(`✅ Total completed bookings: ${finalCount}`);
    }

    // Final verification
    const finalCompletedBookings = await Booking.countDocuments({
      mentorId: MENTOR_USER_ID,
      status: 'completed',
      isActive: true
    });

    const finalProfile = await MentorProfile.findOne({ userId: MENTOR_USER_ID });

    console.log('\n📋 Final Status:');
    console.log(`   Badge: ${finalProfile.badge}`);
    console.log(`   Completed Bookings: ${finalCompletedBookings}`);
    console.log(`   Status: ${finalCompletedBookings >= 50 ? '✅ Best Seller' : '❌ Not Best Seller'}`);

    console.log('\n✅ Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedBestSellerData();

