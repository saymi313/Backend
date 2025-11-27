const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { generateToken } = require('../config/jwt');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/helpers/responseHelpers');

// Middleware to check if Google OAuth is configured
const checkGoogleOAuthConfig = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    return sendErrorResponse(res, 'Google OAuth is not configured. Please contact the administrator.', 503);
  }
  next();
};

// Initiate Google OAuth login
router.get('/google', checkGoogleOAuthConfig, 
  passport.authenticate('google', { 
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar'],
    accessType: 'offline',
    prompt: 'consent' // Force consent screen to get refresh token
  })
);

// Google OAuth callback
router.get('/google/callback', checkGoogleOAuthConfig,
  passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
  async (req, res) => {
    try {
      const user = req.user;
      
      // Check if user needs to complete profile
      // Profile is considered incomplete if phone or country is missing
      const needsProfileSetup = !user.profile.phone || !user.profile.country || 
                                user.profile.phone === '' || user.profile.country === '';
      
      // Generate JWT token
      const token = generateToken({ 
        id: user._id, 
        email: user.email, 
        role: user.role 
      });

      // Redirect to frontend with token and profile setup flag
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/google/callback?token=${token}&role=${user.role}&needsProfileSetup=${needsProfileSetup}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error in Google OAuth callback:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }
);

// Get current user (for checking if logged in via Google)
router.get('/google/me', (req, res) => {
  if (req.user) {
    return sendSuccessResponse(res, 'User retrieved successfully', {
      user: req.user,
      isGoogleAuth: req.user.authProvider === 'google'
    });
  }
  return sendErrorResponse(res, 'Not authenticated', 401);
});

// Logout
router.post('/google/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return sendErrorResponse(res, 'Logout failed', 500);
    }
    return sendSuccessResponse(res, 'Logged out successfully');
  });
});

module.exports = router;

