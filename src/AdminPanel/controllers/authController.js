const User = require('../../shared/models/User');
const { generateToken } = require('../../shared/config/jwt');
const { sendSuccessResponse, sendErrorResponse, sendValidationError } = require('../../shared/utils/helpers/responseHelpers');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../../shared/utils/constants/messages');
const { USER_ROLES } = require('../../shared/utils/constants/roles');
const { validationResult } = require('express-validator');

// Admin login
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { email, password } = req.body;

    // Ensure email is lowercase and trimmed for consistency
    const normalizedEmail = (email || '').toLowerCase().trim();

    if (!normalizedEmail || !password) {
      return sendErrorResponse(res, 'Email and password are required', 400);
    }

    // Find admin user and include password for comparison
    const user = await User.findOne({ email: normalizedEmail, role: USER_ROLES.ADMIN }).select('+password');
    if (!user) {
      console.log('Admin login attempt - User not found:', normalizedEmail);
      return sendErrorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS, 401);
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('Admin login attempt - Account deactivated:', normalizedEmail);
      return sendErrorResponse(res, 'Account is deactivated', 401);
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('Admin login attempt - Invalid password for:', normalizedEmail);
      return sendErrorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS, 401);
    }

    console.log('Admin login successful for:', normalizedEmail);

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
    console.error('Admin login error:', error);
    sendErrorResponse(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Get current admin
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendErrorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, 404);
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
          isVerified: user.isVerified
        }
      }
    });
  } catch (error) {
    console.error('Get admin error:', error);
    sendErrorResponse(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Logout admin
const logout = async (req, res) => {
  res.json({
    success: true,
    message: SUCCESS_MESSAGES.USER_LOGGED_OUT
  });
};

module.exports = {
  login,
  getMe,
  logout
};
