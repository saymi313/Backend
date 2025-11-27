const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const {
  getNotifications,
  markAsRead,
  archiveNotifications,
  getUnreadCount,
  createNotification,
  sendBulkNotifications,
  deleteNotification,
  getNotificationById,
  markAllAsRead,
  getNotificationStats,
  deleteAllNotifications
} = require('../controllers/notificationController');

// Apply authentication middleware to all routes
router.use(authenticate);

// Notification routes
router.get('/', getNotifications);
router.get('/stats', getNotificationStats);
router.get('/unread-count', getUnreadCount);
router.get('/:id', getNotificationById);
router.put('/mark-read', markAsRead);
router.put('/mark-all-read', markAllAsRead);
router.put('/archive', archiveNotifications);
router.delete('/all', deleteAllNotifications);
router.delete('/:id', deleteNotification);

// Admin routes (for internal use)
router.post('/create', createNotification);
router.post('/bulk', sendBulkNotifications);

module.exports = router;
