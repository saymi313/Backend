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

const verifyAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = 'usmanawan@gmail.com';

    // Find admin user
    const admin = await User.findOne({ email: adminEmail, role: USER_ROLES.ADMIN }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      console.log('   Please run: npm run seed:admin');
    } else {
      console.log('✅ Admin user found:');
      console.log('   Email:', admin.email);
      console.log('   Role:', admin.role);
      console.log('   isActive:', admin.isActive);
      console.log('   isVerified:', admin.isVerified);
      console.log('   Has password:', !!admin.password);
      
      // Test password comparison
      const testPassword = '@Mynameisusmanawan1234';
      const isValid = await admin.comparePassword(testPassword);
      console.log('   Password test result:', isValid ? '✅ Valid' : '❌ Invalid');
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying admin user:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the verify function
verifyAdmin();

