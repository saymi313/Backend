const express = require('express');
const router = express.Router();
const { uploadAvatarMiddleware, uploadServiceImagesMiddleware, processUploadedFiles } = require('../middlewares/upload');
const { authenticate } = require('../middlewares/auth');

// Upload profile picture (avatar)
router.post('/profile', authenticate, uploadAvatarMiddleware, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Return the file URL path (relative to server root)
        const fileUrl = `/uploads/avatars/${req.file.filename}`;

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
router.post('/service', authenticate, uploadServiceImagesMiddleware, (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        // Return array of file URL paths
        const fileUrls = req.files.map(file => `/uploads/services/images/${file.filename}`);

        res.json({
            success: true,
            message: `${req.files.length} service image(s) uploaded successfully`,
            fileUrls: fileUrls,
            files: req.files.map(file => ({
                filename: file.filename,
                size: file.size
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
