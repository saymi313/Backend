/*
  One-time seed script to populate mentor profile and services for Usman (mentor)
*/
const mongoose = require('mongoose');

const MentorProfile = require('../src/MentorPanel/models/MentorProfile');
const MentorService = require('../src/MentorPanel/models/Service');
const User = require('../src/shared/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://scholarslee:avenuescholars1234@scholarslee.zrwttoj.mongodb.net/?retryWrites=true&w=majority&appName=Scholarslee';

async function main() {
  const mentorUserId = new mongoose.Types.ObjectId('68f39ff9dd5b2684677e80cb');

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: process.env.DB_NAME || 'test' });
    console.log('Connected.');

    // Upsert MentorProfile
    console.log('Upserting mentor profile...');
    const profileData = {
      userId: mentorUserId,
      title: 'Civil Engineer',
      bio: 'Civil Engineer with cross-disciplinary experience in software engineering and technical mentorship. I help mentees ship real projects, build a professional brand, and land opportunities with strong portfolios and interview confidence.',
      specializations: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'System Design', 'Career Strategy'],
      education: [
        {
          degree: 'Bachelor of Computer Science',
          institution: 'University of Engineering and Technology',
          year: 2019,
          field: 'Computer Science',
          gpa: 3.8
        },
        {
          degree: 'Professional Certification',
          institution: 'Coursera / Meta',
          year: 2022,
          field: 'Front-End Development',
          gpa: 0
        }
      ],
      experience: [
        {
          company: 'Tech Solutions Inc.',
          position: 'Senior Software Engineer',
          duration: '2021 - Present',
          description: 'Leading development of scalable React + Node.js products, establishing code quality standards, and mentoring an internal cohort of 12 engineers with weekly growth plans and code clinics.',
          startDate: new Date('2021-01-01'),
          endDate: null,
          isCurrent: true
        },
        {
          company: 'BuildRight Consultancy',
          position: 'Civil Engineer',
          duration: '2019 - 2021',
          description: 'Delivered infrastructure projects with multi-vendor teams; introduced automation to project reporting, which reduced reporting time by 60%.',
          startDate: new Date('2019-07-01'),
          endDate: new Date('2021-01-01'),
          isCurrent: false
        }
      ],
      achievements: [
        'Grew a mentee community from 0 to 75 active learners in 6 months',
        'Helped 20+ mentees secure internships and full‑time roles',
        'Introduced an interview framework that improved mentee pass rates by 30%'
      ],
      rating: 4.8,
      totalReviews: 25,
      isVerified: true,
      availability: {
        timezone: 'UTC',
        workingHours: '9 AM - 5 PM',
        daysAvailable: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      },
      languages: [
        { language: 'English', proficiency: 'Native' },
        { language: 'Urdu', proficiency: 'Native' },
        { language: 'German', proficiency: 'Beginner' }
      ],
      socialLinks: {
        linkedin: 'https://linkedin.com/in/usman-awan',
        website: 'https://usman-awan.dev'
      },
      background: 'I combine civil engineering rigor with software craftsmanship. My mentorship focuses on outcome-based learning: building a project portfolio, sharpening communication, and developing repeatable problem‑solving habits. Sessions include actionable feedback, curated resources, and career strategy suited to your context.',
      recommendations: [
        { fromName: 'Akbar Husain', text: 'Usman guided me with a clear week‑by‑week plan. I shipped two portfolio apps and cracked my first internship.', rating: 5, createdAt: new Date() },
        { fromName: 'Sarah Ahmed', text: 'His code reviews are gold. I learned how to write maintainable React and how to talk through system design.', rating: 5, createdAt: new Date() },
        { fromName: 'Ali Hassan', text: 'Interview prep was structured and practical. I felt confident walking into the real thing.', rating: 5, createdAt: new Date() }
      ],
      successStory: {
        title: 'From novice to hired in 12 weeks',
        content: 'A mentee with no prior experience shipped 3 portfolio projects, learned data structures, and practiced mock interviews weekly. They landed a junior dev role after 12 weeks of focused mentorship.',
        mediaUrls: [],
        createdAt: new Date(),
        isPublished: true
      }
    };

    let upsertedProfile = await MentorProfile.findOneAndUpdate(
      { userId: mentorUserId },
      { $set: profileData },
      { upsert: true, new: true }
    );

    console.log('Mentor profile upserted:', upsertedProfile._id.toString());

    // Ensure a few connections exist
    console.log('Upserting sample mentee connections...');
    const menteeCandidates = [
      {
        email: 'akbar.husain@example.com',
        password: 'Password1!',
        role: 'mentee',
        profile: { firstName: 'Akbar', lastName: 'Husain', country: 'Pakistan', timezone: 'UTC' }
      },
      {
        email: 'sarah.ahmed@example.com',
        password: 'Password1!',
        role: 'mentee',
        profile: { firstName: 'Sarah', lastName: 'Ahmed', country: 'Pakistan', timezone: 'UTC' }
      },
      {
        email: 'ali.hassan@example.com',
        password: 'Password1!',
        role: 'mentee',
        profile: { firstName: 'Ali', lastName: 'Hassan', country: 'Pakistan', timezone: 'UTC' }
      }
    ];

    const connectionIds = [];
    for (const mentee of menteeCandidates) {
      let u = await User.findOne({ email: mentee.email });
      if (!u) {
        u = new User(mentee);
        await u.save();
      }
      connectionIds.push(u._id);
    }

    // Update connections on profile
    upsertedProfile.connections = connectionIds;
    await upsertedProfile.save();

    // Seed a few services for the mentor
    console.log('Seeding services...');
    const servicesPayload = [
      {
        mentorId: mentorUserId,
        title: 'SOP Writing & Review',
        description: 'Professional Statement of Purpose writing and review service for university applications',
        category: 'Academic Writing',
        packages: [
          { name: 'Basic', price: 3500, duration: '3 days', features: ['1 revision'], calls: 1 },
          { name: 'Standard', price: 5000, duration: '5 days', features: ['2 revisions'], calls: 2 },
          { name: 'Premium', price: 7500, duration: '7 days', features: ['3 revisions', 'Priority feedback'], calls: 3 }
        ],
        images: [],
        rating: 4.9,
        totalReviews: 24,
        status: 'approved'
      },
      {
        mentorId: mentorUserId,
        title: 'Technical Interview Prep',
        description: 'One-on-one technical interview preparation with mock interviews and detailed feedback',
        category: 'Interview Preparation',
        packages: [
          { name: 'Basic', price: 4000, duration: '1 week', features: ['1 mock'], calls: 1 },
          { name: 'Standard', price: 6500, duration: '2 weeks', features: ['2 mocks'], calls: 2 },
          { name: 'Premium', price: 9000, duration: '3 weeks', features: ['3 mocks', 'Resume review'], calls: 3 }
        ],
        images: [],
        rating: 4.8,
        totalReviews: 18,
        status: 'approved'
      },
      {
        mentorId: mentorUserId,
        title: 'Resume Review & Optimization',
        description: 'ATS-friendly resume review and optimization for tech positions',
        category: 'Career Counseling',
        packages: [
          { name: 'Basic', price: 2500, duration: '2 days', features: ['ATS scan', 'Keywords'], calls: 0 },
          { name: 'Standard', price: 4000, duration: '3 days', features: ['ATS scan', 'Rewrite'], calls: 1 },
          { name: 'Premium', price: 6000, duration: '5 days', features: ['ATS scan', 'Rewrite', 'Cover letter'], calls: 1 }
        ],
        images: [],
        rating: 5.0,
        totalReviews: 32,
        status: 'approved'
      }
    ];

    // Remove existing mentor services to avoid duplicates (optional)
    await MentorService.deleteMany({ mentorId: mentorUserId });
    const created = await MentorService.insertMany(servicesPayload);
    console.log(`Created ${created.length} services.`);

    // Update profile.services refs
    upsertedProfile.services = created.map(s => s._id);
    await upsertedProfile.save();
    console.log('Linked services to mentor profile.');

    console.log('Seeding done.');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main();


