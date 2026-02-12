const express = require('express');
const router = express.Router({ mergeParams: true });
const adminLogsController = require('../controllers/adminLogsController');
const { authenticate } = require('../../shared/middlewares/auth');
const { authorizeAdmin } = require('../../shared/middlewares/roleAuth');

// Apply protection middleware to all routes
router.use(authenticate);
router.use(authorizeAdmin);

router.get('/', adminLogsController.getLogs);

module.exports = router;
