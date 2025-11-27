const { sendErrorResponse } = require('../utils/helpers/responseHelpers');
const { ERROR_MESSAGES } = require('../utils/constants/messages');
const { USER_ROLES } = require('../utils/constants/roles');

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
    }

    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return sendErrorResponse(res, ERROR_MESSAGES.FORBIDDEN, 403);
    }

    next();
  };
};

const authorizeAdmin = authorize(USER_ROLES.ADMIN);
const authorizeMentor = authorize(USER_ROLES.MENTOR, USER_ROLES.ADMIN);
const authorizeMentee = authorize(USER_ROLES.MENTEE, USER_ROLES.ADMIN);

module.exports = {
  authorize,
  authorizeAdmin,
  authorizeMentor,
  authorizeMentee,
};
