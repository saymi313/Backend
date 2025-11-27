require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../../shared/models/User');
const { USER_ROLES } = require('../../shared/utils/constants/roles');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is not set');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = 'usmanawan@gmail.com';
    const adminPassword = '@Mynameisusmanawan1234';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail, role: USER_ROLES.ADMIN });
    
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists with email:', adminEmail);
      console.log('   Skipping creation...');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      email: adminEmail,
      password: adminPassword, // Password will be hashed by pre-save middleware
      role: USER_ROLES.ADMIN,
      isActive: true,
      isVerified: true,
      profile: {
        firstName: 'Admin',
        lastName: 'User',
        phone: '',
        country: '',
        timezone: 'UTC'
      }
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('   Email:', adminEmail);
    console.log('   Role:', USER_ROLES.ADMIN);
    console.log('   Status: Active & Verified');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed function
seedAdmin();

