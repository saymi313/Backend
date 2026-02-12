const User = require('../../shared/models/User');
const { sendSuccessResponse, sendErrorResponse, sendValidationError } = require('../../shared/utils/helpers/responseHelpers');
const { USER_ROLES } = require('../../shared/utils/constants/roles');
const { logAction } = require('./adminLogsController');
const { validationResult } = require('express-validator');

// Create a new sub-admin
const createAdmin = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendValidationError(res, errors.array());
        }

        const { email, password, firstName, lastName, permissions } = req.body;
        const adminCreator = req.user;

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return sendErrorResponse(res, 'User with this email already exists', 400);
        }

        // Create user
        // Note: Password hashing is handled by User model pre-save hook
        const newAdmin = new User({
            email,
            password,
            role: USER_ROLES.ADMIN,
            permissions: permissions || [],
            createdBy: adminCreator.id,
            isActive: true,
            isVerified: true, // Admins are auto-verified
            profile: {
                firstName,
                lastName: lastName || '',
                country: '', // Optional
                timezone: 'UTC'
            }
        });

        await newAdmin.save();

        // Log the action is handled inside the try/catch
        await logAction(adminCreator, 'Created Admin', `Created admin ${email} with permissions: ${permissions?.join(', ')}`, req.ip);

        // Remove password from response
        const adminResponse = newAdmin.toObject();
        delete adminResponse.password;

        return sendSuccessResponse(res, 'Admin created successfully', { admin: adminResponse });

    } catch (error) {
        console.error('Create admin error:', error);
        return sendErrorResponse(res, 'Failed to create admin', 500);
    }
};

// Get all admins
const getAllAdmins = async (req, res) => {
    try {
        // Find all users with admin role
        const admins = await User.find({ role: USER_ROLES.ADMIN })
            .select('-password')
            .sort({ createdAt: -1 });

        return sendSuccessResponse(res, 'Admins retrieved successfully', { admins });
    } catch (error) {
        console.error('Get admins error:', error);
        return sendErrorResponse(res, 'Failed to retrieve admins', 500);
    }
};

// Update admin status
const updateAdminStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active' or 'disabled' (mapped to isActive boolean)
        const adminUpdater = req.user;

        if (id === adminUpdater.id) {
            return sendErrorResponse(res, 'You cannot update your own status', 400);
        }

        const adminToUpdate = await User.findById(id);
        if (!adminToUpdate) {
            return sendErrorResponse(res, 'Admin not found', 404);
        }

        // Map string status to boolean isActive
        const isActive = status === 'active';
        adminToUpdate.isActive = isActive;
        await adminToUpdate.save();

        await logAction(adminUpdater, 'Updated Admin Status', `Set status of ${adminToUpdate.email} to ${status}`, req.ip);

        return sendSuccessResponse(res, 'Admin status updated successfully', {
            id,
            status: isActive ? 'active' : 'disabled'
        });

    } catch (error) {
        console.error('Update admin status error:', error);
        return sendErrorResponse(res, 'Failed to update status', 500);
    }
};

// Update admin permissions (optional, if needed later)
// Delete admin
const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const adminDeleter = req.user;

        if (id === adminDeleter.id) {
            return sendErrorResponse(res, 'You cannot delete your own account', 400);
        }

        const adminToDelete = await User.findById(id);
        if (!adminToDelete) {
            return sendErrorResponse(res, 'Admin not found', 404);
        }

        await User.findByIdAndDelete(id);

        await logAction(adminDeleter, 'Deleted Admin', `Deleted admin ${adminToDelete.email}`, req.ip);

        return sendSuccessResponse(res, 'Admin deleted successfully');

    } catch (error) {
        console.error('Delete admin error:', error);
        return sendErrorResponse(res, 'Failed to delete admin', 500);
    }
}


module.exports = {
    createAdmin,
    getAllAdmins,
    updateAdminStatus,
    deleteAdmin
};
