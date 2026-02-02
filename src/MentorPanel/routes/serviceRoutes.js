const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middlewares/auth');
const { authorize } = require('../../shared/middlewares/roleAuth');
const { checkMentorLoginStatus } = require('../middlewares/mentorAuth');
const { uploadServiceImagesMiddleware, cleanupFiles } = require('../../shared/middlewares/upload');
const {
  createMentorService,
  getMyMentorServices,
  getMentorServiceById,
  updateMentorService,
  deleteMentorService,
  uploadMentorServiceImages,
  removeMentorServiceImage,
  getMentorServiceStats
} = require('../controllers/serviceController');

// Apply authentication and role middleware to all routes
router.use(authenticate);
router.use((req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  if (!['mentor', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
});
// Check mentor login status (only for mentors, not admins)
router.use((req, res, next) => {
  if (req.user.role === 'mentor') {
    return checkMentorLoginStatus(req, res, next);
  }
  next();
});

// Service CRUD routes
router.post('/', uploadServiceImagesMiddleware, createMentorService);
router.get('/', getMyMentorServices);
router.get('/stats', getMentorServiceStats);
router.get('/:id', getMentorServiceById);
router.put('/:id', updateMentorService);
router.delete('/:id', (req, res, next) => {
  console.log('🎯 DELETE route hit for mentor services:', req.params.id);
  next();
}, deleteMentorService);

// Image management routes
router.post('/:id/images', uploadServiceImagesMiddleware, uploadMentorServiceImages);
router.delete('/:id/images', removeMentorServiceImage);

module.exports = router;
