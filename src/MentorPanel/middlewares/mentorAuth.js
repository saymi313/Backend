const User = require('../../shared/models/User');
const BlacklistedToken = require('../../shared/models/BlacklistedToken');
const { sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');
const { ERROR_MESSAGES } = require('../../shared/utils/constants/messages');
const { USER_ROLES } = require('../../shared/utils/constants/roles');
const { verifyToken, decodeToken } = require('../../shared/config/jwt');

// Middleware to check if mentor login is paused
const checkMentorLoginStatus = async (req, res, next) => {
  try {
    // Get user from database to check current status
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return sendErrorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, 404);
    }

    // Check if user is a mentor
    if (user.role !== USER_ROLES.MENTOR) {
      return sendErrorResponse(res, 'Access denied. Mentor role required.', 403);
    }

    // Check if user is active
    if (!user.isActive) {
      return sendErrorResponse(res, 'Account is deactivated', 401);
    }

    // Check approval status
    if (user.mentorApprovalStatus === 'pending') {
      return sendErrorResponse(res, 'Your account is pending admin approval. Please wait for approval.', 403);
    }
    if (user.mentorApprovalStatus === 'rejected') {
      return sendErrorResponse(res, 'Your account has been rejected. Please contact support for more information.', 403);
    }

    // Check if login is paused - this is the key check
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

    // All checks passed, continue
    next();
  } catch (error) {
    console.error('Error checking mentor login status:', error);
    return sendErrorResponse(res, 'Failed to verify mentor status', 500);
  }
};

module.exports = {
  checkMentorLoginStatus
};

