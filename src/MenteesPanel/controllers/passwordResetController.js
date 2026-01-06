const User = require('../../shared/models/User');
const PasswordResetOTP = require('../../shared/models/PasswordResetOTP');
const { sendOTPEmail } = require('../../shared/services/emailService');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');
const { validationResult } = require('express-validator');

/**
 * Request password reset - sends OTP to user's email
 * Only works for local authentication users (not Google OAuth)
 */
const requestPasswordReset = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, errors.array()[0].msg, 400);
    }

    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    // For security, always return success message even if user not found
    // This prevents email enumeration attacks
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${normalizedEmail}`);
      return sendSuccessResponse(res, 'If an account with that email exists, we have sent an OTP code.');
    }

    // Check if user is using local authentication
    if (user.authProvider !== 'local') {
      console.log(`Password reset attempted for OAuth user: ${normalizedEmail}`);
      return sendErrorResponse(
        res,
        'This account uses Google Sign-In. Please use Google to access your account.',
        400
      );
    }

    // Check if user account is active
    if (!user.isActive) {
      return sendErrorResponse(res, 'This account has been deactivated.', 400);
    }

    // Generate and save OTP
    const { otp } = await PasswordResetOTP.createOTP(normalizedEmail);

    // Send OTP email in background
    emailService.sendOTPEmail(normalizedEmail, otp)
      .then(emailResult => {
        if (emailResult.success) {
          console.log(`✅ Password reset OTP sent to ${normalizedEmail}`);
        } else {
          console.error(`❌ Background reset OTP failed for ${normalizedEmail}:`, emailResult.error);
        }
      })
      .catch(err => console.error(`❌ Background reset OTP error for ${normalizedEmail}:`, err));

    return sendSuccessResponse(res, 'OTP has been sent to your email address.');
  } catch (error) {
    console.error('Error in requestPasswordReset:', error);
    return sendErrorResponse(res, 'An error occurred. Please try again later.', 500);
  }
};

/**
 * Verify OTP code
 */
const verifyOTP = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, errors.array()[0].msg, 400);
    }

    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Find OTP record
    const otpRecord = await PasswordResetOTP.findOne({ email: normalizedEmail });

    if (!otpRecord) {
      return sendErrorResponse(res, 'No OTP request found. Please request a new OTP.', 400);
    }

    // Check if already verified
    if (otpRecord.verified) {
      return sendErrorResponse(res, 'This OTP has already been used. Please request a new one.', 400);
    }

    // Check if expired
    if (otpRecord.isExpired()) {
      await PasswordResetOTP.deleteOne({ _id: otpRecord._id });
      return sendErrorResponse(res, 'OTP has expired. Please request a new one.', 400);
    }

    // Check attempt limit (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      await PasswordResetOTP.deleteOne({ _id: otpRecord._id });
      return sendErrorResponse(res, 'Too many failed attempts. Please request a new OTP.', 400);
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      await otpRecord.incrementAttempts();
      const remainingAttempts = 5 - otpRecord.attempts;
      return sendErrorResponse(
        res,
        `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
        400
      );
    }

    // Mark OTP as verified
    await otpRecord.markVerified();

    console.log(`✅ OTP verified successfully for ${normalizedEmail}`);
    return sendSuccessResponse(res, 'OTP verified successfully. You can now reset your password.');
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    return sendErrorResponse(res, 'An error occurred. Please try again later.', 500);
  }
};

/**
 * Reset password after OTP verification
 */
const resetPassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, errors.array()[0].msg, 400);
    }

    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Find verified OTP record
    const otpRecord = await PasswordResetOTP.findOne({
      email: normalizedEmail,
      verified: true
    });

    if (!otpRecord) {
      return sendErrorResponse(
        res,
        'Please verify your OTP first before resetting password.',
        400
      );
    }

    // Check if OTP is still within expiry window (give extra 2 minutes for password reset)
    const extendedExpiry = new Date(otpRecord.expiresAt.getTime() + 2 * 60 * 1000);
    if (new Date() > extendedExpiry) {
      await PasswordResetOTP.deleteOne({ _id: otpRecord._id });
      return sendErrorResponse(res, 'Session expired. Please request a new OTP.', 400);
    }

    // Find user
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return sendErrorResponse(res, 'User not found.', 404);
    }

    // Verify user is using local authentication
    if (user.authProvider !== 'local') {
      return sendErrorResponse(
        res,
        'This account uses Google Sign-In. Password cannot be changed.',
        400
      );
    }

    // Update password (will be hashed by pre-save hook)
    user.password = password;
    await user.save();

    // Delete the OTP record
    await PasswordResetOTP.deleteOne({ _id: otpRecord._id });

    console.log(`✅ Password reset successfully for ${normalizedEmail}`);
    return sendSuccessResponse(res, 'Password has been reset successfully. You can now login with your new password.');
  } catch (error) {
    console.error('Error in resetPassword:', error);
    return sendErrorResponse(res, 'An error occurred. Please try again later.', 500);
  }
};

module.exports = {
  requestPasswordReset,
  verifyOTP,
  resetPassword
};

