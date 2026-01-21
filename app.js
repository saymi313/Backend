const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const dotenv = require('dotenv');

// Load environment variables FIRST before requiring any modules that depend on them
dotenv.config();

const errorHandler = require('./src/shared/middlewares/errorHandler');
const { validateEnvironment } = require('./src/shared/config/environment');
const passport = require('./src/shared/config/passport');

// Validate environment variables
validateEnvironment();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://scholarslee.com', 'https://www.scholarslee.com', 'http://localhost:3000']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Webhook routes must be registered before body parsers
app.use('/api/webhooks', require('./src/shared/routes/webhookRoutes'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Scholarslee Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Ignore favicon requests
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Serve uploaded files as static assets
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
// Shared Routes
app.use('/api/upload', require('./src/shared/routes/uploadRoutes')); // File upload routes
app.use('/api/users', require('./src/shared/routes/userRoutes'));
app.use('/api/notifications', require('./src/shared/routes/notificationRoutes'));
app.use('/api/chat', require('./src/shared/routes/chatRoutes')); // Chat routes for both mentors and mentees
app.use('/api/auth', require('./src/shared/routes/googleAuthRoutes')); // Google OAuth routes
app.use('/api/payments', require('./src/shared/routes/paymentRoutes'));

// Mentees Panel Routes
app.use('/api/mentees/auth', require('./src/MenteesPanel/routes/authRoutes'));
app.use('/api/mentees/services', require('./src/MenteesPanel/routes/serviceRoutes'));
app.use('/api/mentees/profile', require('./src/MenteesPanel/routes/profileRoutes'));
app.use('/api/mentees/mentors', require('./src/MenteesPanel/routes/mentorRoutes'));
app.use('/api/mentees', require('./src/MenteesPanel/routes/bookingRoutes'));
app.use('/api/mentees', require('./src/MenteesPanel/routes/feedbackRoutes'));
app.use('/api/contact', require('./src/MenteesPanel/routes/contactRoutes'));

// Mentor Panel Routes  
console.log('🔧 Loading mentor routes...');
app.use('/api/mentors/auth', require('./src/MentorPanel/routes/authRoutes'));
app.use('/api/mentors/dashboard', require('./src/MentorPanel/routes/dashboardRoutes'));
app.use('/api/mentors/services', require('./src/MentorPanel/routes/serviceRoutes'));
app.use('/api/mentors/profile', require('./src/MentorPanel/routes/profileRoutes'));
app.use('/api/mentors', require('./src/MentorPanel/routes/bookingRoutes'));
app.use('/api/mentors', require('./src/MentorPanel/routes/feedbackRoutes'));
app.use('/api/mentors/google-meet', require('./src/MentorPanel/routes/googleMeetRoutes'));
app.use('/api/mentors/badges', require('./src/MentorPanel/routes/badgesRoutes'));
app.use('/api/mentors/revenue', require('./src/MentorPanel/routes/revenueRoutes'));
app.use('/api/mentors/wallet', require('./src/MentorPanel/routes/walletRoutes'));
console.log('✅ Mentor routes loaded');

// Admin Panel Routes
app.use('/api/admin/auth', require('./src/AdminPanel/routes/authRoutes'));
app.use('/api/admin/dashboard', require('./src/AdminPanel/routes/dashboardRoutes'));
app.use('/api/admin/notifications', require('./src/AdminPanel/routes/notificationsRoutes'));
app.use('/api/admin/reviews', require('./src/AdminPanel/routes/reviewsRoutes'));
app.use('/api/admin/services', require('./src/AdminPanel/routes/servicesRoutes'));
app.use('/api/admin/sessions', require('./src/AdminPanel/routes/sessionsRoutes'));
app.use('/api/admin/mentors', require('./src/AdminPanel/routes/mentorsRoutes'));
app.use('/api/admin/settings', require('./src/AdminPanel/routes/settingsRoutes'));
app.use('/api/admin/users', require('./src/AdminPanel/routes/usersRoutes'));
app.use('/api/admin/payouts', require('./src/AdminPanel/routes/payoutRoutes'));

// 404 handler - catch all routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
