const { verifyToken } = require('../config/jwt');
const { sendErrorResponse } = require('../utils/helpers/responseHelpers');
const { ERROR_MESSAGES } = require('../utils/constants/messages');
const BlacklistedToken = require('../models/BlacklistedToken');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
    }

    // Check if token is blacklisted
    const isBlacklisted = await BlacklistedToken.isBlacklisted(token);
    if (isBlacklisted) {
      return sendErrorResponse(res, 'Token has been invalidated. Please login again.', 401);
    }

    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      next();
    } catch (jwtError) {
      return sendErrorResponse(res, ERROR_MESSAGES.INVALID_TOKEN, 401);
    }
  } catch (error) {
    return sendErrorResponse(res, ERROR_MESSAGES.INVALID_TOKEN, 401);
  }
};

module.exports = {
  authenticate,
};
