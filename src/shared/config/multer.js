const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'scholarslee/others';

    // Determine folder based on field name
    if (file.fieldname === 'avatar') {
      folder = 'scholarslee/avatars';
    } else if (file.fieldname === 'images') {
      folder = 'scholarslee/services';
    } else if (file.fieldname === 'documents' || file.fieldname === 'document') {
      folder = 'scholarslee/documents';
    }

    return {
      folder: folder,
      resource_type: 'auto', // Auto-detect image or raw file (for docs)
      public_id: path.parse(file.originalname).name.replace(/\s+/g, '-') + '-' + Date.now(),
    };
  },
});

// File filter for images
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// File filter for documents
const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed!'), false);
  }
};

// Multer configurations
const uploadImages = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  }
});

const uploadAvatar = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
    files: 1 // Only 1 file
  }
});

const uploadDocuments = multer({
  storage: storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 3 // Maximum 3 files
  }
});

// Middleware functions
const uploadServiceImages = uploadImages.array('images', 5);
const uploadSingleAvatar = uploadAvatar.single('avatar');
const uploadMultipleDocuments = uploadDocuments.array('documents', 3);

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB for images, 10MB for documents.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 images, 3 documents allowed.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name. Use correct field names.'
      });
    }
  }

  if (error.message.includes('Only image files are allowed')) {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed for this upload.'
    });
  }

  if (error.message.includes('Only PDF, DOC, DOCX, and TXT files are allowed')) {
    return res.status(400).json({
      success: false,
      message: 'Only PDF, DOC, DOCX, and TXT files are allowed for documents.'
    });
  }

  // Cloudinary errors
  if (error.http_code) {
    return res.status(error.http_code).json({
      success: false,
      message: error.message || 'Cloudinary upload error'
    });
  }

  next(error);
};

module.exports = {
  uploadServiceImages,
  uploadSingleAvatar,
  uploadMultipleDocuments,
  handleUploadError
};
