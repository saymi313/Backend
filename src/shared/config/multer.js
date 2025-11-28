const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Determine base upload directory
// In serverless (Vercel), use /tmp which is writable
// In local development, use ./uploads
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const baseUploadDir = isServerless ? '/tmp/uploads' : 'uploads';

// Ensure upload directories exist (safe for both local and serverless)
const uploadDirs = [
  baseUploadDir,
  `${baseUploadDir}/services`,
  `${baseUploadDir}/services/images`,
  `${baseUploadDir}/avatars`,
  `${baseUploadDir}/documents`
];

// Create directories lazily (only when needed)
const ensureUploadDirs = () => {
  uploadDirs.forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      console.warn(`Warning: Could not create upload directory ${dir}:`, error.message);
    }
  });
};

// Don't create directories at module load in serverless - do it on first upload
if (!isServerless) {
  ensureUploadDirs();
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure directories exist on first upload
    if (isServerless) {
      ensureUploadDirs();
    }
    
    let uploadPath = `${baseUploadDir}/services/images`;
    
    // Different paths for different file types
    if (file.fieldname === 'avatar') {
      uploadPath = `${baseUploadDir}/avatars`;
    } else if (file.fieldname === 'document') {
      uploadPath = `${baseUploadDir}/documents`;
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const filename = `${name}-${uniqueSuffix}${ext}`;
    
    cb(null, filename);
  }
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
  
  next(error);
};

module.exports = {
  uploadServiceImages,
  uploadSingleAvatar,
  uploadMultipleDocuments,
  handleUploadError
};
