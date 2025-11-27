const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { USER_ROLES } = require('../utils/constants/roles');

// Configure Google OAuth Strategy (only if credentials are provided)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar'],
    accessType: 'offline',
    prompt: 'consent' // Force consent screen to get refresh token
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId: profile.id });

    if (user) {
      // Update tokens if user exists
      user.googleAccessToken = accessToken;
      if (refreshToken) {
        user.googleRefreshToken = refreshToken;
      }
      await user.save();
      return done(null, user);
    }

    // Check if user exists with same email (account linking)
    user = await User.findOne({ email: profile.emails[0].value.toLowerCase() });

    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.authProvider = 'google';
      user.googleAccessToken = accessToken;
      if (refreshToken) {
        user.googleRefreshToken = refreshToken;
      }
      user.isVerified = true; // Google emails are verified
      // Update profile picture if available
      if (profile.photos && profile.photos[0]) {
        user.profile.avatar = profile.photos[0].value;
      }
      await user.save();
      return done(null, user);
    }

    // Create new user
    const nameParts = profile.displayName ? profile.displayName.split(' ') : [];
    const firstName = nameParts[0] || profile.name?.givenName || 'User';
    const lastName = nameParts.slice(1).join(' ') || profile.name?.familyName || '';

    user = new User({
      googleId: profile.id,
      email: profile.emails[0].value.toLowerCase(),
      authProvider: 'google',
      googleAccessToken: accessToken,
      googleRefreshToken: refreshToken || null,
      isVerified: true, // Google emails are verified
      role: USER_ROLES.MENTEE, // Default role, can be changed
      profile: {
        firstName,
        lastName,
        avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : ''
      }
    });

    await user.save();
    return done(null, user);
  } catch (error) {
    console.error('Error in Google OAuth strategy:', error);
    return done(error, null);
  }
  }));
} else {
  console.warn('⚠️  Google OAuth credentials not configured. Google sign-in will not be available.');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;

