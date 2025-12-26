const SUCCESS_MESSAGES = {
  USER_REGISTERED: 'User registered successfully',
  USER_LOGGED_IN: 'User logged in successfully',
  USER_LOGGED_OUT: 'User logged out successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
};

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password (SERVER)',
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists with this email',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  INVALID_TOKEN: 'Invalid or expired token',
};

module.exports = {
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
};
