const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Models
const User = require('../src/shared/models/User');
const MentorProfile = require('../src/MentorPanel/models/MentorProfile');
const Service = require('../src/MentorPanel/models/Service');

async function updateMentorAtoZ() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🌱 Connected to MongoDB');

        const targetEmail = 'uawan.official@gmail.com';
        const user = await User.findOne({ email: targetEmail });

        if (!user) {
            console.error(`❌ User with email ${targetEmail} not found`);
            process.exit(1);
        }

        console.log(`👤 Found user: ${user.profile.firstName} ${user.profile.lastName} (ID: ${user._id})`);

        // 1. Update User Profile Table
        user.profile.country = 'Pakistan'; // Original country
        user.profile.bio = 'Civil Engineer & Erasmus Mundus Scholar with international experience in 4 European countries.';
        await user.save();
        console.log('✅ User base profile updated');

        // 2. Update Mentor Profile (A to Z)
        let profile = await MentorProfile.findOne({ userId: user._id });
        if (!profile) {
            console.log('📝 Creating new mentor profile...');
            profile = new MentorProfile({ userId: user._id });
        }

        profile.title = 'Civil Engineer | Erasmus Mundus Scholar (Waves)';
        profile.bio = `I am a dedicated Civil Engineer and a proud Erasmus Mundus Scholar. My academic journey began at NUST Islamabad, where I developed a strong foundation in Engineering. I then pursued my Masters in Waves through the Erasmus Mundus program, which allowed me to study and research in Portugal, Spain, France, and Germany. This multi-country experience has given me a unique perspective on global engineering standards and the intricacies of international scholarship applications. I specialize in helping students navigate the complex path to European higher education.`;

        profile.background = `Studied Civil Engineering at NUST Islamabad (Pakistan) and waves-related engineering across four European countries: Portugal (University of Coimbra), Spain (UPC Barcelona), France (Ecole Centrale de Nantes), and Germany (University of Rostock). Professional background in structural engineering and wave dynamics.`;

        profile.education = [
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
        ];

        profile.experience = [
            {
                company: 'Erasmus Mundus Consortium',
                position: 'International Research Scholar',
                duration: '2021 - 2023',
                description: 'Conducted advanced research on wave patterns and structural integrity across four European universities. Coordinated with international researchers in Portugal, Spain, France, and Germany.',
                startDate: new Date('2021-09-01'),
                endDate: new Date('2023-09-15'),
                isCurrent: false
            },
            {
                company: 'NESPAK (National Engineering Services Pakistan)',
                position: 'Civil Design Engineer',
                duration: '2023 - Present',
                description: 'Providing expert consultancy on infrastructure projects with a focus on sustainable engineering and structural analysis.',
                startDate: new Date('2023-11-01'),
                isCurrent: true
            }
        ];

        profile.achievements = [
            'Recipient of the prestigious Erasmus Mundus Joint Master Degree Scholarship (100% Funded)',
            'Dean\'s Honor Roll at NUST Islamabad for academic excellence',
            'Published researcher in International Engineering Journals',
            'Guest Speaker at European Engineering Seminars (2022)'
        ];

        profile.languages = [
            { language: 'English', proficiency: 'Fluent' },
            { language: 'Urdu', proficiency: 'Native' },
            { language: 'Spanish', proficiency: 'Intermediate' },
            { language: 'German', proficiency: 'Beginner' },
            { language: 'Portuguese', proficiency: 'Beginner' }
        ];

        profile.availability = {
            timezone: 'Asia/Karachi',
            workingHours: '6 PM - 10 PM',
            daysAvailable: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        };

        profile.socialLinks = {
            linkedin: `https://www.linkedin.com/in/uawan-official/`,
            website: `https://uawaan.com`
        };

        profile.successStory = {
            title: 'From NUST to Five European Countries: My Erasmus Mundus Journey',
            content: `My journey began in the classrooms of NUST, dreaming of international exposure. The Erasmus Mundus scholarship turned that dream into a reality. Over two years, I didn't just study engineering; I lived across Portugal, Spain, France, and Germany. I learned to adapt to different cultures, academic styles, and languages while mastering the complex science of waves. Now, my goal is to help other Pakistani engineers bridge the gap between local excellence and global opportunities.`,
            isPublished: true,
            createdAt: new Date()
        };

        profile.specializations = [
            'Civil Engineering',
            'Erasmus Mundus Scholarship',
            'Wave Dynamics',
            'Study in Europe',
            'Structural Engineering',
            'SOP & CV Review'
        ];

        profile.isVerified = true;
        profile.isActive = true;
        profile.badge = 'Level 1 Seller';

        await profile.save();
        console.log('✅ Comprehensive Mentor profile updated');

        // 3. Update Services (Ensuring 3 high-quality services)
        await Service.deleteMany({ mentorId: user._id });
        console.log('🗑️  Refreshed services for this mentor');

        const servicesData = [
            {
                title: 'Erasmus Mundus Scholarship Masterclass',
                description: 'A complete end-to-end guidance program for winning the Erasmus Mundus scholarship. Based on my personal journey through 4 European countries, I will help you select the right consortium and perfect your SOP.',
                category: 'Scholarship Guidance',
                packages: [
                    {
                        name: 'Strategy Session',
                        price: 45,
                        duration: '1 Hour',
                        features: ['Profile Audit', 'Consortium List', 'Initial SOP Review'],
                        calls: 1
                    },
                    {
                        name: 'The Winner\'s Bundle',
                        price: 199,
                        duration: '1 Month',
                        features: ['Unlimited SOP Reviews', 'Interview Prep', 'Letter of Intent Workshop', 'Visa Support'],
                        calls: 5
                    }
                ],
                status: 'approved',
                isActive: true,
                tags: ['Scholarship', 'Erasmus', 'Europe', 'Free PhD/Masters']
            },
            {
                title: 'Civil Engineering Career Roadmap (International)',
                description: 'Tailored for Civil Engineering students and graduates looking to transition into the international market. I provide insights into industry requirements in Europe and how to specialize in fields like Wave Dynamics.',
                category: 'Career Counseling',
                packages: [
                    {
                        name: 'Career Jumpstart',
                        price: 55,
                        duration: '45 Mins',
                        features: ['CV Optimization', 'LinkedIn Branding', 'Industry Insights'],
                        calls: 1
                    }
                ],
                status: 'approved',
                isActive: true,
                tags: ['Civil Engineering', 'Job Hunt', 'International Career']
            },
            {
                title: 'Wave Dynamics & High-Tech Engineering Consultation',
                description: 'Deep dive into the technical aspects of wave dynamics and modern engineering. Perfect for students applying to specialized research masters in Germany, France, or Spain.',
                category: 'Research Guidance',
                packages: [
                    {
                        name: 'Technical Mentorship',
                        price: 80,
                        duration: '90 Mins',
                        features: ['Research Proposal Review', 'Technical Topic Discussion', 'European Prof Connections'],
                        calls: 1
                    }
                ],
                status: 'approved',
                isActive: true,
                tags: ['Engineering', 'Research', 'Tech Study']
            }
        ];

        const createdServices = [];
        for (const sData of servicesData) {
            const service = new Service({
                mentorId: user._id,
                ...sData
            });
            await service.save();
            createdServices.push(service._id);
            console.log(`🚀 Service created: "${service.title}"`);
        }

        profile.services = createdServices;
        await profile.save();
        console.log('🔗 Comprehensive services linked');

        console.log('🎉 Full "A to Z" update completed successfully!');

    } catch (error) {
        console.error('❌ Error updating mentor profile:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

updateMentorAtoZ();
