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

// Public user profile (no authentication required)
router.get('/:id', getUserById);

module.exports = router;
