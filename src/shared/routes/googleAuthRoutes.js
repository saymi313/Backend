const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { generateToken } = require('../config/jwt');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/helpers/responseHelpers');

// Utility to get frontend URL from environment or return appropriate fallback
const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://scholarslee.com' : 'http://localhost:3000');
};

// Middleware to check if Google OAuth is configured
const checkGoogleOAuthConfig = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    return sendErrorResponse(res, 'Google OAuth is not configured. Please contact the administrator.', 503);
  }
  next();
};

// Initiate Google OAuth login
router.get('/google', (req, res, next) => {
  // Store intended role in session if provided (e.g. from signup page checkboxes)
  if (req.query.role && ['mentor', 'mentee'].includes(req.query.role)) {
    req.session.intendedRole = req.query.role;
  }
  next();
}, checkGoogleOAuthConfig,
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
      const intendedRole = req.session.intendedRole;

      // Clear the intended role from session immediately
      delete req.session.intendedRole;

      // If user is new (no role assigned) and we have an intended role from the session, assign it
      if ((!user.role || user.role === null) && intendedRole) {
        user.role = intendedRole;
        user.needsRoleSelection = false;

        // If newly joined as a mentor, they start with 'pending' approval
        if (intendedRole === 'mentor') {
          user.mentorApprovalStatus = 'pending';
        }

        await user.save();
      }

      // Check if user still needs to select a role (new users who didn't pre-select on signup)
      const needsRoleSelection = !user.role || user.role === null;

      // Check if user needs to complete their basic profile
      const needsProfileSetup = !user.profile.phone || !user.profile.country ||
        user.profile.phone === '' || user.profile.country === '';

      // Generate a fresh JWT token
      const token = generateToken({
        id: user._id,
        email: user.email,
        role: user.role || 'pending' // Default to 'pending' role in token if selection is required
      });

      // Redirect to frontend with all necessary flags
      const frontendUrl = getFrontendUrl();
      const redirectUrl = `${frontendUrl}/auth/google/callback?token=${token}&role=${user.role || 'pending'}&needsRoleSelection=${needsRoleSelection}&needsProfileSetup=${needsProfileSetup}`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Error in Google OAuth callback:', error);
      const frontendUrl = getFrontendUrl();
      res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }
);

// Get current session user status
router.get('/google/me', (req, res) => {
  if (req.user) {
    return sendSuccessResponse(res, 'User retrieved successfully', {
      user: req.user,
      isGoogleAuth: req.user.authProvider === 'google'
    });
  }
  return sendErrorResponse(res, 'Not authenticated', 401);
});

// Logout handles both passport logout and session invalidation
router.post('/google/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return sendErrorResponse(res, 'Logout failed', 500);
    }
    return sendSuccessResponse(res, 'Logged out successfully');
  });
});

module.exports = router;

