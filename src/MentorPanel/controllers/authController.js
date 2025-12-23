const User = require('../../shared/models/User');
const BlacklistedToken = require('../../shared/models/BlacklistedToken');
const Notification = require('../../shared/models/Notification');
const { generateToken, decodeToken } = require('../../shared/config/jwt');
const { sendSuccessResponse, sendErrorResponse, sendValidationError } = require('../../shared/utils/helpers/responseHelpers');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../../shared/utils/constants/messages');
const { USER_ROLES } = require('../../shared/utils/constants/roles');
const { validationResult } = require('express-validator');

// Register mentor
const register = async (req, res) => {
  try {
    console.log('📝 Mentor registration started for:', req.body.email);

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return sendValidationError(res, errors.array());
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists in User collection
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists in User collection:', email);
      return sendErrorResponse(res, ERROR_MESSAGES.USER_ALREADY_EXISTS, 400);
    }

    // Generate verification OTP
    const emailService = require('../../shared/services/emailService');
    const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    console.log('✅ Generated OTP for mentor registration');

    // Check feature flag for mentor verification
    const Settings = require('../../shared/models/Settings');
    const settings = await Settings.getSettings();
    const requiresApproval = settings.featureFlags?.enableMentorVerification ?? true;

    console.log(`🔧 Feature Flag - enableMentorVerification: ${requiresApproval}`);

    // Create/update pending user (not actual user yet)
    const PendingUser = require('../../shared/models/PendingUser');
    const pendingUser = await PendingUser.createPendingUser({
      email,
      password,
      role: USER_ROLES.MENTOR,
      mentorApprovalStatus: requiresApproval ? 'pending' : 'approved', // Auto-approve if flag is disabled
      profile: {
        firstName,
        lastName
      },
      verificationOTP,
      verificationOTPExpires
    });
    console.log(`✅ Pending mentor created: ${pendingUser._id} (Approval: ${pendingUser.mentorApprovalStatus})`);

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, verificationOTP);
      console.log('✅ Verification email sent to mentor');
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      // Pending user is created but email failed. They can use "Resend OTP".
    }

    // Notify admin about new mentor signup (only if approval is required)
    if (requiresApproval) {
      console.log('📧 Mentor requires approval - would send admin notification (not implemented yet)');
    } else {
      console.log('✅ Mentor auto-approved - no admin notification needed');
    }

    // Do NOT generate token - mentor must verify email first, then wait for approval (if required)
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for the verification code.',
      data: {
        user: {
          email: pendingUser.email,
          role: pendingUser.role,
          profile: pendingUser.profile,
          isVerified: false,
          mentorApprovalStatus: pendingUser.mentorApprovalStatus
        }
        // No token - must verify email first
      }
    });
  } catch (error) {
    console.error('❌ Mentor registration error:', error);
    sendErrorResponse(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Login mentor
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email, role: USER_ROLES.MENTOR }).select('+password');
    if (!user) {
      return sendErrorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS, 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return sendErrorResponse(res, 'Account is deactivated', 401);
    }

    // Check approval status (null means auto-approved for existing mentors)
    if (user.mentorApprovalStatus === 'pending') {
      return sendErrorResponse(res, 'Your account is pending admin approval. Please wait for approval before logging in.', 403);
    }
    if (user.mentorApprovalStatus === 'rejected') {
      return sendErrorResponse(res, 'Your account has been rejected. Please contact support for more information.', 403);
    }

    // Check if login is paused
    if (user.isLoginPaused) {
      return sendErrorResponse(res, 'Your login access has been paused by admin. Please contact support for more information.', 403);
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return sendErrorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS, 401);
    }

    // Generate JWT token
    const token = generateToken({
      id: user._id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.USER_LOGGED_IN,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          profile: user.profile
        },
        token
      }
    });
  } catch (error) {
    console.error('Mentor login error:', error);
    sendErrorResponse(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Get current mentor
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendErrorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, 404);
    }

    // Check if login is paused
    if (user.isLoginPaused) {
      // Blacklist the current token to force logout
      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          // Decode token to get expiration date
          const decoded = decodeToken(token);
          const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days if no exp

          // Blacklist the token with userId and expiresAt
          await BlacklistedToken.blacklistToken(token, user._id, expiresAt);
        } catch (blacklistError) {
          console.error('Error blacklisting token:', blacklistError);
          // Continue even if blacklisting fails
        }
      }
      return sendErrorResponse(res, 'Your login access has been paused by admin. Please contact support for more information.', 403);
    }

    // Check approval status
    if (user.mentorApprovalStatus === 'pending') {
      return sendErrorResponse(res, 'Your account is pending admin approval. Please wait for approval.', 403);
    }
    if (user.mentorApprovalStatus === 'rejected') {
      return sendErrorResponse(res, 'Your account has been rejected. Please contact support for more information.', 403);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          profile: user.profile,
          isActive: user.isActive,
          isVerified: user.isVerified,
          mentorApprovalStatus: user.mentorApprovalStatus,
          isLoginPaused: user.isLoginPaused
        }
      }
    });
  } catch (error) {
    console.error('Get mentor error:', error);
    sendErrorResponse(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Logout mentor
const logout = async (req, res) => {
  try {
    const authHeader = req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        // Decode token to get expiration and user ID
        const decoded = decodeToken(token);

        if (decoded && decoded.exp) {
          // Calculate expiration date from token
          const expiresAt = new Date(decoded.exp * 1000);
          const userId = decoded.id;

          // Blacklist the token
          await BlacklistedToken.blacklistToken(token, userId, expiresAt);
        }
      } catch (error) {
        // If token is invalid, we can still proceed with logout
        // The token will naturally expire anyway
        console.warn('Error blacklisting token during logout:', error.message);
      }
    }

    return sendSuccessResponse(res, SUCCESS_MESSAGES.USER_LOGGED_OUT);
  } catch (error) {
    console.error('Logout error:', error);
    // Even if blacklisting fails, return success to allow client-side cleanup
    return sendSuccessResponse(res, SUCCESS_MESSAGES.USER_LOGGED_OUT);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout
};
