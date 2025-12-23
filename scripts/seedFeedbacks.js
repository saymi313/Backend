const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Models
const User = require('../src/shared/models/User');
const MentorProfile = require('../src/MentorPanel/models/MentorProfile');
const MentorService = require('../src/MentorPanel/models/Service');
const ServiceFeedback = require('../src/shared/models/ServiceFeedback');

const seedFeedbacks = async () => {
    try {
        console.log('🌱 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const mentorUserId = "6945933f8ae8ff4516363150";
        console.log(`🔍 Finding mentor with User ID: ${mentorUserId}`);

        const mentorUser = await User.findById(mentorUserId);
        if (!mentorUser) {
            throw new Error('Mentor user not found');
        }
        console.log(`Mentors Name: ${mentorUser.profile.firstName} ${mentorUser.profile.lastName}`);

        const mentorProfile = await MentorProfile.findOne({ userId: mentorUserId });
        if (!mentorProfile) {
            throw new Error('Mentor profile not found');
        }

        // Find a service to attach ratings to
        const services = await MentorService.find({ mentorId: mentorUserId, status: 'approved' });
        if (services.length === 0) {
            throw new Error('No approved services found for this mentor. Cannot add feedback.');
        }
        const targetService = services[0];
        console.log(`🎯 Attaching feedbacks to service: "${targetService.title}"`);

        // Authentic Feedbacks Data
        const feedbacksData = [
            {
                name: "Sarah Chen",
                rating: 5,
                comment: "Soban was incredibly helpful with my application to TU Munich. His insights into the essay requirements were spot on, and he helped me structure my SOP perfectly. I got admitted!"
            },
            {
                name: "Michael Schmidt",
                rating: 5,
                comment: "Excellent guidance on the Erasmus Mundus scholarship application. He knows exactly what the selection committee is looking for. Highly recommended for anyone targeting European universities."
            },
            {
                name: "Ayesha Khan",
                rating: 4,
                comment: "Very knowledgeable and patient. Helped me understand the visa process for Germany which was very confusing. Just wish we had a bit more time on the call, but overall great value."
            },
            {
                name: "David Park",
                rating: 5,
                comment: "The mock interview session was a game changer. Soban asked very relevant technical questions that actually came up in my real interview. Thanks to him, I felt confident and prepared."
            },
            {
                name: "Elena Rodriguez",
                rating: 5,
                comment: "I was lost with my university selection, but Soban helped me shortlist programs that were the best fit for my profile. He is very professional and truly cares about his mentees' success."
            }
        ];

        // Create Dummy Mentees
        console.log('👤 Creating/Finding dummy mentees...');
        const menteeIds = [];

        for (const data of feedbacksData) {
            const email = `mentee.${data.name.replace(/\s+/g, '.').toLowerCase()}@example.com`;
            let mentee = await User.findOne({ email });

            if (!mentee) {
                mentee = await User.create({
                    email,
                    password: 'password123', // Dummy password
                    role: 'mentee',
                    isActive: true,
                    isVerified: true,
                    profile: {
                        firstName: data.name.split(' ')[0],
                        lastName: data.name.split(' ')[1],
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`,
                        country: 'International'
                    }
                });
                console.log(`   + Created mentee: ${data.name}`);
            } else {
                console.log(`   * Found existing mentee: ${data.name}`);
            }
            menteeIds.push(mentee._id);
        }

        // Clear existing feedbacks for this service/mentor from these specific fake users to avoid duplicates
        await ServiceFeedback.deleteMany({
            serviceId: targetService._id,
            menteeId: { $in: menteeIds }
        });

        // Insert Feedbacks
        console.log('📝 Inserting feedbacks...');
        for (let i = 0; i < feedbacksData.length; i++) {
            const data = feedbacksData[i];
            await ServiceFeedback.create({
                serviceId: targetService._id,
                mentorId: mentorUserId,
                menteeId: menteeIds[i],
                rating: data.rating,
                comment: data.comment,
                isActive: true,
                isVisible: true
            });
        }

        // Recalculate Service Rating
        console.log('🔄 Recalculating Service Ratings...');
        await targetService.recalculateRating();
        console.log(`   Service New Rating: ${targetService.rating} (${targetService.totalReviews} reviews)`);

        // Recalculate Mentor Global Rating
        console.log('🔄 Recalculating Mentor Profile Ratings...');
        const allMentorFeedbacks = await ServiceFeedback.find({ mentorId: mentorUserId, isActive: true });

        const totalRating = allMentorFeedbacks.reduce((sum, fb) => sum + fb.rating, 0);
        const avgRating = allMentorFeedbacks.length > 0 ? (totalRating / allMentorFeedbacks.length) : 0;

        mentorProfile.rating = Math.round(avgRating * 10) / 10;
        mentorProfile.totalReviews = allMentorFeedbacks.length;
        await mentorProfile.save();

        console.log(`   Mentor New Rating: ${mentorProfile.rating} (${mentorProfile.totalReviews} reviews)`);
        console.log('🎉 Seeding successfully completed!');

    } catch (error) {
        console.error('❌ Error seeding feedbacks:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
};

seedFeedbacks();
