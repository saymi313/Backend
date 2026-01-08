const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/shared/models/User');
const MentorProfile = require('../src/MentorPanel/models/MentorProfile');
const Service = require('../src/MentorPanel/models/Service');

async function finalSync() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🌱 Connected to MongoDB');

        const ids = [
            '671fb45a8df2d8544a04d3de', // User 1
            '695e8162aba0e7da1cbc2bfe'  // User 2 (The one user mentioned)
        ];

        const targetSlug = 'usman-awan';

        // Data to sync (from my previous comprehensive update)
        const profileData = {
            title: 'Civil Engineer | Erasmus Mundus Scholar (Waves)',
            bio: `I am a dedicated Civil Engineer and a proud Erasmus Mundus Scholar. My academic journey began at NUST Islamabad, where I developed a strong foundation in Engineering. I then pursued my Masters in Waves through the Erasmus Mundus program, which allowed me to study and research in Portugal, Spain, France, and Germany. This multi-country experience has given me a unique perspective on global engineering standards and the intricacies of international scholarship applications. I specialize in helping students navigate the complex path to European higher education.`,
            background: `Studied Civil Engineering at NUST Islamabad (Pakistan) and waves-related engineering across four European countries: Portugal (University of Coimbra), Spain (UPC Barcelona), France (Ecole Centrale de Nantes), and Germany (University of Rostock). Professional background in structural engineering and wave dynamics.`,
            education: [
                {
                    degree: 'Master of Science (Erasmus Mundus)',
                    institution: 'Erasmus Mundus Joint Master Degree in Waves',
                    year: 2023,
                    field: 'Wave Dynamics & Coastal Engineering',
                    gpa: 4.0
                },
                {
                    degree: 'Bachelor of Engineering',
                    institution: 'NUST Islamabad',
                    year: 2021,
                    field: 'Civil Engineering',
                    gpa: 3.85
                }
            ],
            experience: [
                {
                    company: 'Erasmus Mundus Consortium',
                    position: 'International Research Scholar',
                    duration: '2021 - 2023',
                    description: 'Conducted advanced research on wave patterns and structural integrity across four European universities.',
                    startDate: new Date('2021-09-01'),
                    endDate: new Date('2023-09-15'),
                    isCurrent: false
                },
                {
                    company: 'National Engineering Services Pakistan',
                    position: 'Civil Design Engineer',
                    duration: '2023 - Present',
                    description: 'Providing expert consultancy on infrastructure projects.',
                    startDate: new Date('2023-11-01'),
                    isCurrent: true
                }
            ],
            achievements: [
                'Recipient of the prestigious Erasmus Mundus Joint Master Degree Scholarship',
                'Dean\'s Honor Roll at NUST Islamabad',
                'Published researcher in International Engineering Journals'
            ],
            languages: [
                { language: 'English', proficiency: 'Fluent' },
                { language: 'Urdu', proficiency: 'Native' },
                { language: 'Spanish', proficiency: 'Intermediate' }
            ],
            availability: {
                timezone: 'Asia/Karachi',
                workingHours: '6 PM - 10 PM',
                daysAvailable: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            },
            socialLinks: {
                linkedin: 'https://www.linkedin.com/in/uawan-official/',
                website: 'https://uawaan.com'
            },
            specializations: ['Civil Engineering', 'Erasmus Mundus Scholarship', 'Study in Europe'],
            isVerified: true,
            isActive: true,
            badge: 'Level 1 Seller'
        };

        const serviceTemplates = [
            {
                title: 'Erasmus Mundus Scholarship Masterclass',
                description: 'A complete end-to-end guidance program for winning the Erasmus Mundus scholarship.',
                category: 'Scholarship Guidance',
                packages: [{ name: 'Strategy Session', price: 45, duration: '1 Hour', features: ['Profile Audit'], calls: 1 }],
                status: 'approved', isActive: true
            },
            {
                title: 'Civil Engineering Career Roadmap (International)',
                description: 'Tailored for Civil Engineering students and graduates looking to transition into the international market.',
                category: 'Career Counseling',
                packages: [{ name: 'Career Jumpstart', price: 55, duration: '45 Mins', features: ['CV Optimization'], calls: 1 }],
                status: 'approved', isActive: true
            }
        ];

        for (const userId of ids) {
            console.log(`Syncing profile for User: ${userId}`);
            const user = await User.findById(userId);
            if (user) {
                user.profile.country = 'Pakistan';
                await user.save();
            }

            let profile = await MentorProfile.findOne({ userId });
            if (!profile) {
                profile = new MentorProfile({ userId });
            }

            Object.assign(profile, profileData);
            // Ensure only one has the exact primary slug to avoid uniqueness error, 
            // but actually we want the one user is using to have it.
            profile.slug = (userId === '695e8162aba0e7da1cbc2bfe') ? targetSlug : `usman-awan-alt-${userId}`;

            // Success story
            profile.successStory = {
                title: 'My Erasmus Mundus Journey',
                content: 'My journey from NUST to Europe...',
                isPublished: true,
                createdAt: new Date()
            };

            await profile.save();
            console.log(`✅ Profile synced for ${userId}. Slug: ${profile.slug}`);

            // Sync services
            await Service.deleteMany({ mentorId: userId });
            for (const sTemp of serviceTemplates) {
                const service = new Service({ ...sTemp, mentorId: userId });
                await service.save();
            }
            console.log(`✅ Services synced for ${userId}`);
        }

        console.log('🎉 Final sync completed!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

finalSync();
