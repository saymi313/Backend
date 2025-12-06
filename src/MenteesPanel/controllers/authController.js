const User = require('../../shared/models/User');
const { generateToken } = require('../../shared/config/jwt');
const { sendSuccessResponse, sendErrorResponse, sendValidationError } = require('../../shared/utils/helpers/responseHelpers');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../../shared/utils/constants/messages');
const { USER_ROLES } = require('../../shared/utils/constants/roles');
const { validationResult } = require('express-validator');
const emailService = require('../../shared/services/emailService');

// Register user (mentee or mentor)
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { email, password, role, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendErrorResponse(res, ERROR_MESSAGES.USER_ALREADY_EXISTS, 400);
    }

    // Validate role
    if (![USER_ROLES.MENTEE, USER_ROLES.MENTOR].includes(role)) {
      return sendErrorResponse(res, 'Invalid role. Must be mentee or mentor', 400);
    }

    // Generate verification OTP
    const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = await User.create({
      email,
      password,
      role,
      profile: {
        firstName,
        lastName
      },
      isVerified: false,
      verificationOTP,
      verificationOTPExpires
    });

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, verificationOTP);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // User is created but email failed. They can use "Resend OTP".
    }

    // Do NOT return token. User must verify email first.
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for the verification code.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          profile: user.profile,
          isVerified: user.isVerified
        }
      }
    });
  } catch (error) {
    ('Registration error:', error);
    sendErrorResponse(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Login user
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendErrorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS, 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return sendErrorResponse(res, 'Account is deactivated', 401);
    }

    // Check if user is verified (only for local auth)
    if (user.authProvider === 'local' && !user.isVerified) {
      return sendErrorResponse(res, 'Please verify your email address before logging in', 403, {
        isVerified: false,
        email: user.email
      });
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
    ('Login error:', error);
    sendErrorResponse(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Get current user
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
    ('Get me error:', error);
    sendErrorResponse(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Logout user (client-side token removal)
const logout = async (req, res) => {
  res.json({
    success: true,
    message: SUCCESS_MESSAGES.USER_LOGGED_OUT
  });
};

// Verify email with OTP
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return sendErrorResponse(res, 'Email and OTP are required', 400);
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      verificationOTP: otp,
      verificationOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return sendErrorResponse(res, 'Invalid or expired verification code', 400);
    }

    // Mark as verified and clear OTP
    user.isVerified = true;
    user.verificationOTP = undefined;
    user.verificationOTPExpires = undefined;
    await user.save();

    // Generate token for auto-login
    const token = generateToken({
      id: user._id,
      email: user.email,
      role: user.role
    });

    return sendSuccessResponse(res, 'Email verified successfully', {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        isVerified: true
      },
      token
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return sendErrorResponse(res, 'Failed to verify email', 500);
  }
};

// Resend verification email
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendErrorResponse(res, 'Email is required', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    if (user.isVerified) {
      return sendErrorResponse(res, 'Email is already verified', 400);
    }

    // Generate new OTP
    const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.verificationOTP = verificationOTP;
    user.verificationOTPExpires = verificationOTPExpires;
    await user.save();

    // Send email
    try {
      await emailService.sendVerificationEmail(user.email, verificationOTP);
      return sendSuccessResponse(res, 'Verification code sent successfully');
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return sendErrorResponse(res, 'Failed to send verification email', 500);
    }

  } catch (error) {
    console.error('Resend verification error:', error);
    return sendErrorResponse(res, 'Failed to resend verification code', 500);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  verifyEmail,
  resendVerificationEmail
};
