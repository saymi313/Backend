const express = require('express');
const router = express.Router();
const { uploadAvatarMiddleware, uploadServiceImagesMiddleware, processUploadedFiles } = require('../middlewares/upload');
const { authenticate } = require('../middlewares/auth');

const User = require('../models/User');

// Upload profile picture (avatar)
router.post('/profile', authenticate, uploadAvatarMiddleware, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Return the file URL path (Cloudinary returns full URL in path)
        const fileUrl = req.file.path; // Cloudinary URL

        // Update user profile in database with new avatar URL
        // req.user.id comes from the authenticate middleware (decoded token)
        await User.findByIdAndUpdate(
            req.user.id,
            { 'profile.avatar': fileUrl },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Profile picture uploaded successfully',
            fileUrl: fileUrl,
            filename: req.file.filename,
            size: req.file.size
        });
    } catch (error) {
        console.error('Profile upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload profile picture'
        });
    }
});

// Upload service images (multiple files)
router.post('/service', authenticate, (req, res, next) => {
    console.log('🔍 /api/upload/service hit');
    console.log('🔍 Headers content-type:', req.headers['content-type']);
    next();
}, uploadServiceImagesMiddleware, (req, res) => {
    try {
        console.log('🔍 Service upload middleware passed');
        console.log('🔍 req.files:', req.files ? req.files.length : 'undefined');
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        // Return array of file URL paths
        const fileUrls = req.files.map(file => file.path); // Cloudinary URLs

        res.json({
            success: true,
            message: `${req.files.length} service image(s) uploaded successfully`,
            fileUrls: fileUrls,
            files: req.files.map(file => ({
                filename: file.filename,
                size: file.size,
                url: file.path
            }))
        });
    } catch (error) {
        console.error('Service images upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload service images'
        });
    }
});

module.exports = router;
