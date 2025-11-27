const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
];

// Optional but recommended for Google OAuth
const optionalEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'SESSION_SECRET',
];

const validateEnvironment = () => {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    process.exit(1);
  }
  
  // Warn about missing optional Google OAuth variables
  const missingOptionalVars = optionalEnvVars.filter(varName => !process.env[varName]);
  if (missingOptionalVars.length > 0) {
    console.warn('⚠️  Missing optional Google OAuth environment variables:', missingOptionalVars);
    console.warn('   Google OAuth will not work until these are configured.');
  }
  
  console.log('Environment variables validated successfully');
};

module.exports = {
  validateEnvironment,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI,
};
