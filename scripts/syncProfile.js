const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/shared/models/User');
const MentorProfile = require('../src/MentorPanel/models/MentorProfile');
const Service = require('../src/MentorPanel/models/Service');

async function syncProfile() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🌱 Connected to MongoDB');

        const sourceUserId = '671fb45a8df2d8544a04d3de'; // The one I updated
        const targetUserId = '695e8162aba0e7da1cbc2bfe'; // The one the user is seeing

        // 1. Get source data
        const sourceProfile = await MentorProfile.findOne({ userId: sourceUserId });
        const sourceServices = await Service.find({ mentorId: sourceUserId });

        if (!sourceProfile) {
            console.error('❌ Source profile not found');
            process.exit(1);
        }

        // 2. Update target user
        const targetUser = await User.findById(targetUserId);
        if (targetUser) {
            targetUser.profile.country = 'Pakistan';
            targetUser.profile.bio = 'Civil Engineer & Erasmus Mundus Scholar with international experience in 4 European countries.';
            await targetUser.save();
            console.log('✅ Target User base profile updated');
        }

        // 3. Update/Create target profile
        let targetProfile = await MentorProfile.findOne({ userId: targetUserId });
        if (!targetProfile) {
            targetProfile = new MentorProfile({ userId: targetUserId });
        }

        // Copy fields
        const fieldsToCopy = [
            'title', 'bio', 'background', 'education', 'experience',
            'achievements', 'languages', 'availability', 'socialLinks',
            'successStory', 'specializations', 'isVerified', 'isActive', 'badge'
        ];

        fieldsToCopy.forEach(field => {
            targetProfile[field] = sourceProfile[field];
        });

        targetProfile.slug = 'usman-awan';
        await targetProfile.save();
        console.log('✅ Target Mentor profile updated and slug set to usman-awan');

        // 4. Sync Services
        await Service.deleteMany({ mentorId: targetUserId });
        console.log('🗑️  Cleared old services for target user');

        const newServices = [];
        for (const serviceData of sourceServices) {
            const sObj = serviceData.toObject();
            delete sObj._id;
            delete sObj.createdAt;
            delete sObj.updatedAt;
            sObj.mentorId = targetUserId;
            const newService = new Service(sObj);
            await newService.save();
            newServices.push(newService._id);
            console.log(`🚀 Service synced: "${newService.title}"`);
        }

        targetProfile.services = newServices;
        await targetProfile.save();
        console.log('🔗 Services linked to target profile');

        console.log('🎉 Sync completed successfully!');

    } catch (error) {
        console.error('❌ Error during sync:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

syncProfile();
