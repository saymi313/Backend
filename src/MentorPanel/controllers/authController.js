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
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendErrorResponse(res, ERROR_MESSAGES.USER_ALREADY_EXISTS, 400);
    }

    // Create mentor user with pending approval status
    const user = await User.create({
      email,
      password,
      role: USER_ROLES.MENTOR,
      mentorApprovalStatus: 'pending', // New mentors require admin approval
      profile: {
        firstName,
        lastName
      }
    });

    // Notify admin about new mentor signup
    try {
      const adminUsers = await User.find({ role: USER_ROLES.ADMIN, isActive: true });
      if (adminUsers.length > 0) {
        const adminIds = adminUsers.map(admin => admin._id);
        await Notification.sendBulk(adminIds, {
          type: 'mentor_verification',
          title: 'New Mentor Signup Request',
          message: `A new mentor "${firstName} ${lastName}" (${email}) has registered and is awaiting approval.`,
          priority: 'high',
          deliveryChannels: [{ type: 'in-app', status: 'pending' }],
          actionUrl: '/admin/mentors',
          actionText: 'Review Request'
        });
      }
    } catch (notificationError) {
      console.error('Error sending admin notification for new mentor:', notificationError);
      // Don't fail registration if notification fails
    }

    // Do NOT generate token - mentor must wait for approval
    res.status(201).json({
      success: true,
      message: 'Registration successful. Your account is pending admin approval. You will be notified once approved.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          profile: user.profile,
          mentorApprovalStatus: user.mentorApprovalStatus
        }
        // No token - must wait for approval
      }
    });
  } catch (error) {
    console.error('Mentor registration error:', error);
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

    console.log(`🔍 Mentor login attempt for: ${email}`);
    console.log(`   - User ID: ${user._id}`);
    console.log(`   - isActive: ${user.isActive}`);
    console.log(`   - mentorApprovalStatus: ${user.mentorApprovalStatus}`);
    console.log(`   - isLoginPaused: ${user.isLoginPaused}`);

    // Check if user is active
    if (!user.isActive) {
      console.log(`   ❌ Login blocked: Account is deactivated`);
      return sendErrorResponse(res, 'Account is deactivated', 401);
    }

    // Check approval status (null means auto-approved for existing mentors)
    if (user.mentorApprovalStatus === 'pending') {
      console.log(`   ❌ Login blocked: Account pending approval`);
      return sendErrorResponse(res, 'Your account is pending admin approval. Please wait for approval before logging in.', 403);
    }
    if (user.mentorApprovalStatus === 'rejected') {
      console.log(`   ❌ Login blocked: Account rejected`);
      return sendErrorResponse(res, 'Your account has been rejected. Please contact support for more information.', 403);
    }

    // Check if login is paused
    if (user.isLoginPaused) {
      console.log(`   ❌ Login blocked: Login is paused`);
      return sendErrorResponse(res, 'Your login access has been paused by admin. Please contact support for more information.', 403);
    }

    console.log(`   ✅ All checks passed, proceeding with login`);

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
