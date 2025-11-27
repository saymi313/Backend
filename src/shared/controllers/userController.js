const User = require('../models/User');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/helpers/responseHelpers');
const fs = require('fs');
const path = require('path');

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    return sendSuccessResponse(res, 'Profile retrieved successfully', { user });
  } catch (error) {
    console.error('Get profile error:', error);
    return sendErrorResponse(res, 'Failed to retrieve profile', 500);
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, country, timezone } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!firstName || !lastName) {
      return sendErrorResponse(res, 'First name and last name are required', 400);
    }

    const updateData = {
      'profile.firstName': firstName,
      'profile.lastName': lastName,
      'profile.phone': phone || '',
      'profile.country': country || '',
      'profile.timezone': timezone || 'UTC'
    };

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    return sendSuccessResponse(res, 'Profile updated successfully', { user });
  } catch (error) {
    console.error('Update profile error:', error);
    return sendErrorResponse(res, 'Failed to update profile', 500);
  }
};

// Upload user avatar
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return sendErrorResponse(res, 'No file uploaded', 400);
    }

    // Get current user to check for existing avatar
    const user = await User.findById(userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    // Delete old avatar if exists
    if (user.profile.avatar) {
      const oldAvatarPath = path.join(__dirname, '../../', user.profile.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Update user with new avatar path
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    user.profile.avatar = avatarPath;
    await user.save();

    return sendSuccessResponse(res, 'Avatar uploaded successfully', { 
      user: user.toJSON(),
      avatarUrl: avatarPath
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return sendErrorResponse(res, 'Failed to upload avatar', 500);
  }
};

// Delete user avatar
const deleteAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    // Delete avatar file if exists
    if (user.profile.avatar) {
      const avatarPath = path.join(__dirname, '../../', user.profile.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Remove avatar from user profile
    user.profile.avatar = '';
    await user.save();

    return sendSuccessResponse(res, 'Avatar deleted successfully', { 
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Delete avatar error:', error);
    return sendErrorResponse(res, 'Failed to delete avatar', 500);
  }
};

// Get user by ID (public profile)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password -email');
    
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    return sendSuccessResponse(res, 'User retrieved successfully', { user });
  } catch (error) {
    console.error('Get user by ID error:', error);
    return sendErrorResponse(res, 'Failed to retrieve user', 500);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  getUserById
};
