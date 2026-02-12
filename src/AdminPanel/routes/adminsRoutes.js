const express = require('express');
const router = express.Router({ mergeParams: true });
const adminManagementController = require('../controllers/adminManagementController');
const { authenticate } = require('../../shared/middlewares/auth');
const { authorizeAdmin } = require('../../shared/middlewares/roleAuth');
const { check } = require('express-validator');

console.log('DEBUG: Authenticate:', authenticate);
console.log('DEBUG: AuthorizeAdmin:', authorizeAdmin);

// Apply protection middleware to all routes
router.use(authenticate);
router.use(authorizeAdmin);

// Create admin validation
const createAdminValidation = [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required (min 6 chars)').isLength({ min: 6 }),
    check('firstName', 'First name is required').not().isEmpty()
];

// Routes
router.post('/', createAdminValidation, adminManagementController.createAdmin);
router.get('/', adminManagementController.getAllAdmins);
router.patch('/:id/status', adminManagementController.updateAdminStatus);
router.delete('/:id', adminManagementController.deleteAdmin);

module.exports = router;
