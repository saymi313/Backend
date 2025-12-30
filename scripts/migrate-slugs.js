const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}

// Import models
const MentorProfile = require('../src/MentorPanel/models/MentorProfile');
const MentorService = require('../src/MentorPanel/models/Service');
const User = require('../src/shared/models/User'); // Corrected path

// Helper to slugify text
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-')   // Replace multiple - with single -
        .replace(/^-+/, '')       // Trim - from start of text
        .replace(/-+$/, '');      // Trim - from end of text
};

const migrate = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Migrate Mentor Profiles
        console.log('Starting Mentor Profile migration...');
        const mentors = await MentorProfile.find({}).populate('userId');
        let mentorCount = 0;

        for (const mentor of mentors) {
            if (!mentor.userId || !mentor.userId.profile) {
                console.log(`Skipping mentor ${mentor._id} (No user profile found)`);
                continue;
            }

            const fullName = `${mentor.userId.profile.firstName} ${mentor.userId.profile.lastName}`;
            let baseSlug = slugify(fullName);
            let slug = baseSlug;
            let counter = 1;

            // Ensure uniqueness
            while (await MentorProfile.findOne({ slug, _id: { $ne: mentor._id } })) {
                slug = `${baseSlug}-${counter}`;
                counter++;
            }

            mentor.slug = slug;
            await mentor.save();
            console.log(`Updated mentor: ${fullName} -> ${slug}`);
            mentorCount++;
        }
        console.log(`Completed Mentor Profile migration: ${mentorCount} records updated\n`);

        // Migrate Services
        console.log('Starting Service migration...');
        const services = await MentorService.find({});
        let serviceCount = 0;

        for (const service of services) {
            let baseSlug = slugify(service.title);
            let slug = baseSlug;
            let counter = 1;

            // For services, we want uniqueness per mentor ideally, but global uniqueness is easier for routing
            // Or we check uniqueness combined with mentorId if we use /:mentorSlug/:serviceSlug
            // Let's ensure global uniqueness for simplicity in validation, 
            // but the requirement is /:mentorName/:ServiceName. 
            // This means service slugs don't strictly NEED to be globally unique if looked up via mentor,
            // BUT Mongoose doesn't support compound unique indexes easily on sparse fields in the same way.
            // Let's just make them unique-ish or just valid slugs.

            // Actually, if we use /service-details/:mentorSlug/:serviceSlug
            // We just need the slug to be unique *for that mentor*.

            // Check if another service by SAME mentor has this slug
            while (await MentorService.findOne({
                slug,
                mentorId: service.mentorId,
                _id: { $ne: service._id }
            })) {
                slug = `${baseSlug}-${counter}`;
                counter++;
            }

            service.slug = slug;
            await service.save();
            console.log(`Updated service: ${service.title} -> ${slug}`);
            serviceCount++;
        }
        console.log(`Completed Service migration: ${serviceCount} records updated`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

migrate();
