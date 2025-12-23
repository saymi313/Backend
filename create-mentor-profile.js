/*
  Create comprehensive MentorProfile for Usairam Saeed
  Includes: Background, Education, Experience, Recommendations, Success Story
*/
require('dotenv').config();
const mongoose = require('mongoose');
const MentorProfile = require('./src/MentorPanel/models/MentorProfile');
const User = require('./src/shared/models/User');
const Service = require('./src/MentorPanel/models/Service');

const MONGODB_URI = process.env.MONGODB_URI;
const MENTOR_ID = '6945933f8ae8ff4516363150';

async function createMentorProfile() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected\n');

        console.log('👤 Creating/Updating comprehensive mentor profile...');

        const profileData = {
            userId: MENTOR_ID,
            title: 'Software Engineer & AI Engineering Student',
            bio: 'Software Engineer with a strong academic foundation from FAST-NUCES Islamabad, currently advancing my expertise in AI Engineering at Technical University of Munich. I specialize in helping students navigate university applications, scholarship opportunities, and career transitions in technology and higher education.',

            specializations: [
                'University Applications',
                'Scholarship Guidance',
                'Academic Writing (SOP, Essays)',
                'Software Engineering',
                'AI and Machine Learning',
                'Career Counseling',
                'Study Abroad Planning',
                'Interview Preparation'
            ],

            education: [
                {
                    degree: 'Master of Science in AI Engineering',
                    institution: 'Technical University of Munich (TU Munich)',
                    year: 2026, // Expected graduation
                    field: 'Artificial Intelligence Engineering',
                    gpa: 0, // In progress
                    isCurrent: true
                },
                {
                    degree: 'Bachelor of Science in Computer Science',
                    institution: 'FAST-NUCES Islamabad',
                    year: 2022,
                    field: 'Computer Science',
                    gpa: 3.7,
                    isCurrent: false
                }
            ],

            experience: [
                {
                    company: 'TU Munich - Research Assistant',
                    position: 'AI Research Assistant',
                    duration: '2024 - Present',
                    description: 'Working on machine learning research projects, contributing to academic papers, and assisting in teaching AI fundamentals to undergraduate students.',
                    startDate: new Date('2024-10-01'),
                    endDate: null,
                    isCurrent: true
                },
                {
                    company: 'Tech Startup - Pakistan',
                    position: 'Software Engineer',
                    duration: '2022 - 2024',
                    description: 'Developed full-stack web applications using React and Node.js, implemented scalable backend systems, and mentored junior developers in best coding practices.',
                    startDate: new Date('2022-06-01'),
                    endDate: new Date('2024-09-30'),
                    isCurrent: false
                }
            ],

            achievements: [
                'Successfully guided 15+ students to secure admissions in top European universities',
                'Helped 8 students win Erasmus Mundus scholarships',
                'Secured admission to TU Munich with full funding for AI Engineering',
                'Published research paper on machine learning applications',
                'Mentored over 30 students in university application processes'
            ],

            rating: 4.9,
            totalReviews: 35,
            isVerified: true,

            availability: {
                timezone: 'Europe/Berlin',
                workingHours: '10 AM - 6 PM CET',
                daysAvailable: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            },

            languages: [
                { language: 'English', proficiency: 'Fluent' },
                { language: 'Urdu', proficiency: 'Native' },
                { language: 'German', proficiency: 'Intermediate' }
            ],

            socialLinks: {
                linkedin: 'https://linkedin.com/in/usairam-saeed',
                github: 'https://github.com/usairamsaeed',
                website: 'https://usairamsaeed.dev'
            },

            background: `I am a Software Engineer currently pursuing my Master's in AI Engineering at the prestigious Technical University of Munich, Germany. My academic journey began at FAST-NUCES Islamabad, where I graduated with a Bachelor's in Computer Science with honors.

Having successfully navigated the challenging path of international university applications and scholarships myself, I understand the struggles, uncertainties, and high stakes involved. This personal experience drives my passion for helping students achieve their dreams of studying abroad.

My mentorship approach is personalized and strategic. I focus on:
- Building compelling narratives in SOPs and essays
- Strategic university selection based on individual profiles
- Scholarship application strategies (especially for Erasmus Mundus and DAAD)
- Technical interview preparation for CS/Engineering students
- Long-term career planning in tech and academia

I combine my technical expertise in software engineering and AI with proven strategies for application success. Over the past 3 years, I've helped students secure admissions at top universities including TU Munich, ETH Zurich, RWTH Aachen, and various Erasmus Mundus programs.

My goal is not just to help you get accepted, but to set you up for long-term success in your academic and professional journey.`,

            recommendations: [
                {
                    fromName: 'Hassan Ali',
                    text: 'Usairam\'s guidance was invaluable for my Erasmus Mundus application. His detailed feedback on my SOP and strategic advice helped me secure the scholarship. He knows exactly what admission committees are looking for!',
                    rating: 5,
                    createdAt: new Date('2024-11-15')
                },
                {
                    fromName: 'Fatima Ahmed',
                    text: 'I was struggling with my university applications until I started working with Usairam. He helped me craft a compelling narrative and select the right universities. Got accepted to 4 out of 5 universities I applied to!',
                    rating: 5,
                    createdAt: new Date('2024-10-20')
                },
                {
                    fromName: 'Ali Khan',
                    text: 'Best decision I made was to get Usairam\'s help with my TU Munich application. His insights about the German education system and application process were spot-on. Now studying in Munich thanks to him!',
                    rating: 5,
                    createdAt: new Date('2024-09-05')
                },
                {
                    fromName: 'Sarah Johnson',
                    text: 'Usairam doesn\'t just help with applications - he mentors you for the long term. His career advice and technical interview prep were crucial for landing my dream internship. Highly recommended!',
                    rating: 5,
                    createdAt: new Date('2024-08-12')
                }
            ],

            successStory: {
                title: 'From Pakistan to TU Munich: Helping Students Achieve Their Dreams',
                content: `One of my proudest achievements as a mentor is helping Ahmed, a student from Lahore, transform his profile and secure admission to ETH Zurich with a full scholarship.

Ahmed came to me 6 months before application deadlines, feeling overwhelmed and unsure about his chances. His grades were good but not exceptional, and he struggled to articulate his research interests.

**Our strategy:**
- Conducted deep-dive sessions to identify his genuine research passions
- Helped him connect with a professor at his university for a research project
- Crafted multiple iterations of his SOP, each one more compelling
- Prepared him thoroughly for interviews with mock sessions
- Applied strategically to 8 universities with varying selectivity

**Results:**
- Accepted to ETH Zurich (his dream school) with full funding
- Also received offers from TU Delft and KTH Royal Institute
- Won a prestigious research scholarship
- Published his first research paper before even starting his Master's

Ahmed's success story shows that with the right guidance, strategic planning, and dedicated effort, even ambitious goals are achievable. Now he's thriving in his program and has started mentoring other Pakistani students interested in European universities.

This is what drives me - seeing students not just get accepted, but truly excel in their academic journeys.`,
                mediaUrls: [],
                createdAt: new Date(),
                isPublished: true
            }
        };

        const mentorProfile = await MentorProfile.findOneAndUpdate(
            { userId: MENTOR_ID },
            { $set: profileData },
            { upsert: true, new: true }
        );

        console.log('✅ Mentor profile created/updated successfully!\n');
        console.log('📋 Profile Summary:');
        console.log(`   Name: Usairam Saeed`);
        console.log(`   Title: ${mentorProfile.title}`);
        console.log(`   Specializations: ${mentorProfile.specializations.slice(0, 3).join(', ')}...`);
        console.log(`   Education: ${mentorProfile.education.length} degrees`);
        console.log(`   Experience: ${mentorProfile.experience.length} positions`);
        console.log(`   Achievements: ${mentorProfile.achievements.length} accomplishments`);
        console.log(`   Recommendations: ${mentorProfile.recommendations.length} reviews`);
        console.log(`   Rating: ${mentorProfile.rating}/5.0`);
        console.log(`   Success Story: ${mentorProfile.successStory.title}`);
        console.log('\n✅ Profile is now complete and comprehensive!');

        // Create Services
        console.log('\n📦 Creating mentor services...');

        const services = [
            {
                mentorId: MENTOR_ID,
                title: 'University Application Review & Strategy',
                description: 'Comprehensive review of your university applications with personalized strategy. I will help you select the right universities, craft compelling SOPs, and optimize your entire application package for maximum success.',
                category: 'University Applications',
                packages: [
                    {
                        name: 'Basic Review',
                        price: 100,
                        duration: '60 minutes',
                        features: [
                            'Application document review',
                            'University selection advice',
                            'SOP feedback'
                        ],
                        calls: 1
                    },
                    {
                        name: 'Standard Package',
                        price: 150,
                        duration: '90 minutes',
                        features: [
                            'Detailed application review',
                            'University selection strategy',
                            'SOP/Essay feedback and editing',
                            'Application timeline planning',
                            'Email templates for professor contact'
                        ],
                        calls: 2
                    },
                    {
                        name: 'Premium Package',
                        price: 250,
                        duration: '3 hours',
                        features: [
                            'Complete application package review',
                            'Personalized university list',
                            'Multiple SOP/Essay iterations',
                            'Interview preparation',
                            '30-day email support'
                        ],
                        calls: 4
                    }
                ],
                isActive: true,
                rating: 4.9,
                totalReviews: 28,
                status: 'approved',
                tags: ['university', 'applications', 'SOP', 'admissions']
            },
            {
                mentorId: MENTOR_ID,
                title: 'Scholarship Application Masterclass',
                description: 'Specialized guidance for competitive scholarships including Erasmus Mundus, DAAD, Fulbright, and other European funding opportunities. Learn proven strategies that helped me and my mentees secure full funding.',
                category: 'Scholarship Guidance',
                packages: [
                    {
                        name: 'Scholarship Consultation',
                        price: 80,
                        duration: '45 minutes',
                        features: [
                            'Scholarship selection guidance',
                            'Application strategy overview',
                            'Document checklist'
                        ],
                        calls: 1
                    },
                    {
                        name: 'Full Guidance',
                        price: 120,
                        duration: '90 minutes',
                        features: [
                            'Scholarship selection based on your profile',
                            'Application strategy and timeline',
                            'Motivation letter review and editing',
                            'Budget planning assistance',
                            'Interview preparation tips'
                        ],
                        calls: 2
                    }
                ],
                isActive: true,
                rating: 5.0,
                totalReviews: 15,
                status: 'approved',
                tags: ['scholarship', 'funding', 'erasmus', 'DAAD']
            },
            {
                mentorId: MENTOR_ID,
                title: 'SOP & Essay Writing Workshop',
                description: 'Intensive workshop to craft outstanding Statements of Purpose and application essays. Learn the art of storytelling, structure, and persuasion that admission committees look for.',
                category: 'Academic Writing',
                packages: [
                    {
                        name: 'Quick Review',
                        price: 50,
                        duration: '30 minutes',
                        features: [
                            'SOP/Essay review',
                            'Structural feedback',
                            'Grammar check'
                        ],
                        calls: 1
                    },
                    {
                        name: 'Complete Workshop',
                        price: 80,
                        duration: '60 minutes',
                        features: [
                            'SOP structure and framework',
                            'Storytelling techniques',
                            'Multiple draft reviews',
                            'Grammar and style editing',
                            'Examples of successful SOPs'
                        ],
                        calls: 2
                    },
                    {
                        name: 'Premium Editing',
                        price: 150,
                        duration: '2 weeks support',
                        features: [
                            'Complete SOP development',
                            'Unlimited revisions for 2 weeks',
                            'Multiple document editing',
                            'Personalized examples',
                            'Email support'
                        ],
                        calls: 3
                    }
                ],
                isActive: true,
                rating: 4.8,
                totalReviews: 42,
                status: 'approved',
                tags: ['SOP', 'essay', 'writing', 'academic']
            },
            {
                mentorId: MENTOR_ID,
                title: 'Technical Interview Preparation (CS/AI)',
                description: 'Comprehensive preparation for technical interviews at top tech companies and research positions. Covers algorithms, data structures, system design, and AI/ML concepts.',
                category: 'Interview Preparation',
                packages: [
                    {
                        name: 'Mock Interview',
                        price: 70,
                        duration: '60 minutes',
                        features: [
                            'One mock interview session',
                            'Detailed feedback',
                            'Problem-solving tips'
                        ],
                        calls: 1
                    },
                    {
                        name: 'Interview Prep Package',
                        price: 100,
                        duration: '90 minutes',
                        features: [
                            'Mock interview sessions',
                            'Algorithm problem-solving practice',
                            'System design discussions',
                            'AI/ML concept review',
                            'Behavioral interview prep'
                        ],
                        calls: 2
                    }
                ],
                isActive: true,
                rating: 4.9,
                totalReviews: 18,
                status: 'approved',
                tags: ['interview', 'technical', 'coding', 'algorithms']
            },
            {
                mentorId: MENTOR_ID,
                title: 'Study Abroad Planning - Complete Package',
                description: 'End-to-end guidance for your study abroad journey. From university selection to visa application, I will guide you through every step of the process.',
                category: 'Study Abroad Guidance',
                packages: [
                    {
                        name: 'Initial Consultation',
                        price: 60,
                        duration: '45 minutes',
                        features: [
                            'Country selection guidance',
                            'Program recommendations',
                            'Timeline planning'
                        ],
                        calls: 1
                    },
                    {
                        name: 'Complete Guidance',
                        price: 200,
                        duration: '3 months support',
                        features: [
                            'Country and university selection',
                            'Application strategy and timeline',
                            'Document preparation guidance',
                            'Visa application assistance',
                            'Financial planning advice',
                            'Pre-departure preparation',
                            '3 months email support'
                        ],
                        calls: 4
                    }
                ],
                isActive: true,
                rating: 5.0,
                totalReviews: 12,
                status: 'approved',
                tags: ['study abroad', 'visa', 'planning', 'guidance']
            },
            {
                mentorId: MENTOR_ID,
                title: 'Career Counseling for Tech Students',
                description: 'Personalized career guidance for students pursuing careers in software engineering, AI, and technology. Get insights on career paths, skill development, and industry trends.',
                category: 'Career Counseling',
                packages: [
                    {
                        name: 'Career Consultation',
                        price: 50,
                        duration: '30 minutes',
                        features: [
                            'Career path discussion',
                            'Skill assessment',
                            'Industry insights'
                        ],
                        calls: 1
                    },
                    {
                        name: 'Career Planning Package',
                        price: 120,
                        duration: '90 minutes',
                        features: [
                            'Comprehensive career assessment',
                            'Personalized roadmap',
                            'Skill development plan',
                            'Industry networking tips',
                            'Resume review'
                        ],
                        calls: 2
                    }
                ],
                isActive: true,
                rating: 4.7,
                totalReviews: 25,
                status: 'approved',
                tags: ['career', 'counseling', 'tech', 'software']
            }
        ];

        // Delete existing services for this mentor
        await Service.deleteMany({ mentorId: MENTOR_ID });
        console.log('   🗑️  Cleared existing services');

        // Create new services
        const createdServices = await Service.insertMany(services);
        console.log(`   ✅ Created ${createdServices.length} services`);

        console.log('\n📋 Services Summary:');
        createdServices.forEach((service, index) => {
            console.log(`   ${index + 1}. ${service.title} - $${service.price} (${service.duration} min)`);
        });


    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected');
    }
}

createMentorProfile();
