const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { uploadAvatarMiddleware } = require('../middlewares/upload');
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  getUserById
} = require('../controllers/userController');

// Apply authentication middleware to all routes except public user profile
router.use(authenticate);

// User profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/avatar', uploadAvatarMiddleware, uploadAvatar);
router.delete('/avatar', deleteAvatar);

// Role selection for new Google OAuth users
router.post('/select-role', async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.user.id;
    const User = require('../models/User');
    const { generateToken } = require('../config/jwt');
    const { sendSuccessResponse, sendErrorResponse } = require('../utils/helpers/responseHelpers');

    // Validate role
    if (!['mentor', 'mentee'].includes(role)) {
      return sendErrorResponse(res, 'Invalid role. Must be "mentor" or "mentee"', 400);
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    // Only allow if user hasn't selected role yet
    if (user.role && user.role !== null) {
      return sendErrorResponse(res, 'Role already selected', 400);
    }

    // Update role
    user.role = role;
    user.needsRoleSelection = false;

    // If mentor, set approval status to pending
    if (role === 'mentor') {
      user.mentorApprovalStatus = 'pending';
    }

    await user.save();

    // Generate new token with updated role
    const token = generateToken({
      id: user._id,
      email: user.email,
      role: user.role
    });

    return sendSuccessResponse(res, 'Role selected successfully', {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        needsRoleSelection: false
      },
      token
    });
  } catch (error) {
    console.error('Error selecting role:', error);
    const { sendErrorResponse } = require('../utils/helpers/responseHelpers');
    return sendErrorResponse(res, 'Failed to select role', 500);
  }
});

// Public user profile (no authentication required)
router.get('/:id', getUserById);

module.exports = router;
