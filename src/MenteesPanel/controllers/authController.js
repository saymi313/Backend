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
    console.log('📝 Registration started for:', req.body.email);

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return sendValidationError(res, errors.array());
    }

    const { email, password, role, firstName, lastName } = req.body;

    // Check if user already exists in User collection
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists in User collection:', email);
      return sendErrorResponse(res, ERROR_MESSAGES.USER_ALREADY_EXISTS, 400);
    }

    // Validate role
    if (![USER_ROLES.MENTEE, USER_ROLES.MENTOR].includes(role)) {
      console.log('❌ Invalid role:', role);
      return sendErrorResponse(res, 'Invalid role. Must be mentee or mentor', 400);
    }

    // Generate verification OTP
    const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    console.log('✅ Generated OTP for', email);

    // Create/update pending user (not actual user yet)
    const PendingUser = require('../../shared/models/PendingUser');
    const pendingUser = await PendingUser.createPendingUser({
      email,
      password,
      role,
      profile: {
        firstName,
        lastName
      },
      verificationOTP,
      verificationOTPExpires,
      mentorApprovalStatus: role === USER_ROLES.MENTOR ? 'pending' : null
    });
    console.log('✅ Pending user created:', pendingUser._id);

    // Send verification email
    console.log('📧 Attempting to send verification email to:', email);
    const emailStartTime = Date.now();
    try {
      const emailResult = await emailService.sendVerificationEmail(email, verificationOTP);
      const emailDuration = ((Date.now() - emailStartTime) / 1000).toFixed(2);

      if (emailResult.success) {
        console.log(`✅ Verification email sent successfully in ${emailDuration}s`);
      } else {
        console.error(`⚠️ Email service returned failure: ${emailResult.error}`);
      }
    } catch (emailError) {
      const emailDuration = ((Date.now() - emailStartTime) / 1000).toFixed(2);
      console.error(`❌ Failed to send verification email after ${emailDuration}s:`, emailError.message);
      // Pending user is created but email failed. They can use "Resend OTP".
    }

    // Do NOT return token. User must verify email first.
    console.log('✅ Registration complete, sending response');
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for the verification code.',
      data: {
        user: {
          email: pendingUser.email,
          role: pendingUser.role,
          profile: pendingUser.profile,
          isVerified: false
        }
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
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

    console.log('🔍 Verifying OTP for:', email);

    // First, check PendingUser collection
    const PendingUser = require('../../shared/models/PendingUser');
    const pendingUser = await PendingUser.findOne({
      email: email.toLowerCase(),
      verificationOTP: otp,
      verificationOTPExpires: { $gt: Date.now() }
    }).select('+password');

    if (pendingUser) {
      console.log('✅ Found pending user, creating actual user...');

      // Create actual user from pending user
      const user = await User.create({
        email: pendingUser.email,
        password: pendingUser.password,
        role: pendingUser.role,
        profile: pendingUser.profile,
        isVerified: true, // Already verified via OTP
        authProvider: 'local',
        mentorApprovalStatus: pendingUser.mentorApprovalStatus
      });

      console.log('✅ User created in User collection:', user._id);

      // Delete pending user
      await PendingUser.deleteOne({ _id: pendingUser._id });
      console.log('✅ Pending user deleted');

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
    }

    // Fallback: Check existing User collection (for backward compatibility)
    const user = await User.findOne({
      email: email.toLowerCase(),
      verificationOTP: otp,
      verificationOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('❌ Invalid or expired verification code');
      return sendErrorResponse(res, 'Invalid or expired verification code', 400);
    }

    console.log('✅ Found existing user, marking as verified...');

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
    console.error('❌ Email verification error:', error);
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

    console.log('🔄 Resending verification email for:', email);

    // Check PendingUser first
    const PendingUser = require('../../shared/models/PendingUser');
    const pendingUser = await PendingUser.findOne({ email: email.toLowerCase() });

    if (pendingUser) {
      console.log('✅ Found in PendingUser collection');

      // Generate new OTP
      const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000);

      pendingUser.verificationOTP = verificationOTP;
      pendingUser.verificationOTPExpires = verificationOTPExpires;
      await pendingUser.save();

      // Send email
      try {
        await emailService.sendVerificationEmail(pendingUser.email, verificationOTP);
        console.log('✅ Verification code resent successfully');
        return sendSuccessResponse(res, 'Verification code sent successfully');
      } catch (emailError) {
        console.error('❌ Failed to send verification email:', emailError);
        return sendErrorResponse(res, 'Failed to send verification email', 500);
      }
    }

    // Fallback: Check User collection (backward compatibility)
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log('❌ User not found in either collection');
      return sendErrorResponse(res, 'User not found', 404);
    }

    if (user.isVerified) {
      console.log('⚠️ Email is already verified');
      return sendErrorResponse(res, 'Email is already verified', 400);
    }

    console.log('✅ Found in User collection');

    // Generate new OTP
    const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationOTP = verificationOTP;
    user.verificationOTPExpires = verificationOTPExpires;
    await user.save();

    // Send email
    try {
      await emailService.sendVerificationEmail(user.email, verificationOTP);
      console.log('✅ Verification code resent successfully');
      return sendSuccessResponse(res, 'Verification code sent successfully');
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      return sendErrorResponse(res, 'Failed to send verification email', 500);
    }

  } catch (error) {
    console.error('❌ Resend verification error:', error);
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
