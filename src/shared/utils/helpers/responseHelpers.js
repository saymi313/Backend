const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../constants/messages');

const sendSuccessResponse = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendErrorResponse = (res, message, statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

const sendValidationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: ERROR_MESSAGES.VALIDATION_ERROR,
    errors,
  });
};

module.exports = {
  sendSuccessResponse,
  sendErrorResponse,
  sendValidationError,
};
