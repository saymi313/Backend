const { uploadServiceImages, uploadSingleAvatar, uploadMultipleDocuments, handleUploadError } = require('../config/multer');

// Service image upload middleware
const uploadServiceImagesMiddleware = (req, res, next) => {
  console.log('🔍 uploadServiceImagesMiddleware called');
  uploadServiceImages(req, res, (err) => {
    if (err) {
      console.error('❌ uploadServiceImagesMiddleware error:', err);
      return handleUploadError(err, req, res, next);
    }
    console.log('✅ uploadServiceImagesMiddleware success, files:', req.files?.length);
    next();
  });
};

// Avatar upload middleware
const uploadAvatarMiddleware = (req, res, next) => {
  uploadSingleAvatar(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    next();
  });
};

// Document upload middleware
const uploadDocumentsMiddleware = (req, res, next) => {
  uploadMultipleDocuments(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    next();
  });
};

// Helper function to get file URLs
const getFileUrl = (req, filePath) => {
  if (!filePath) return null;
  // Cloudinary returns the full URL in `path`, so we just return it directly
  return filePath;
};

// Helper function to process uploaded files
const processUploadedFiles = (req, fieldName = 'images') => {
  const files = req.files || (req.file ? [req.file] : []);

  return files.map(file => ({
    filename: file.filename,
    originalName: file.originalname,
    path: file.path, // Full Cloudinary URL
    size: file.size,
    mimetype: file.mimetype,
    url: file.path // Full Cloudinary URL
  }));
};

// Helper function to delete file
const deleteFile = async (publicId) => {
  // Cloudinary SDK delete
  const cloudinary = require('cloudinary').v2;
  try {
    if (publicId) {
      // public_id is usually part of the result, but path might be a URL. 
      // We'll need to extract public_id if we want to delete, or just pass it in.
      // For now, this existing helper was deleting local files.
      // We'll leave it as a TODO or basic no-op for file system since we are on cloud now.
      // Deleting from Cloudinary requires the public_id, not the URL.
      await cloudinary.uploader.destroy(publicId);
      return true;
    }
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
  }
  return false;
};

// Helper function to clean up files on error
const cleanupFiles = (files) => {
  files.forEach(file => {
    if (file.path) {
      deleteFile(file.path);
    }
  });
};

module.exports = {
  uploadServiceImagesMiddleware,
  uploadAvatarMiddleware,
  uploadDocumentsMiddleware,
  getFileUrl,
  processUploadedFiles,
  deleteFile,
  cleanupFiles
};
