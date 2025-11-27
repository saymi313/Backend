const { uploadServiceImages, uploadSingleAvatar, uploadMultipleDocuments, handleUploadError } = require('../config/multer');

// Service image upload middleware
const uploadServiceImagesMiddleware = (req, res, next) => {
  uploadServiceImages(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
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
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/${filePath}`;
};

// Helper function to process uploaded files
const processUploadedFiles = (req, fieldName = 'images') => {
  const files = req.files || (req.file ? [req.file] : []);
  
  return files.map(file => ({
    filename: file.filename,
    originalName: file.originalname,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    url: getFileUrl(req, file.path)
  }));
};

// Helper function to delete file
const deleteFile = (filePath) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
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
