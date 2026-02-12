const AdminLog = require('../models/AdminLog');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

// Get logs
const getLogs = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const logs = await AdminLog.find()
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const total = await AdminLog.countDocuments();

        return sendSuccessResponse(res, 'Logs retrieved successfully', {
            logs,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error('Get logs error:', error);
        return sendErrorResponse(res, 'Failed to retrieve logs', 500);
    }
};

// Internal helper to log actions
const logAction = async (user, action, details = '', ip = '') => {
    try {
        // Safety check: if user is not provided or incomplete
        if (!user || !user._id) {
            console.error('Cannot log action: User information missing');
            return;
        }

        const name = user.profile ?
            `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() :
            (user.email || 'Unknown');

        await AdminLog.create({
            who: user._id,
            actorName: name || 'Admin',
            actorEmail: user.email || 'unknown',
            action,
            details: typeof details === 'object' ? JSON.stringify(details) : details,
            ip
        });
    } catch (error) {
        console.error('Failed to create admin log:', error);
        // Don't throw - logging failure shouldn't block the main action
    }
};

module.exports = {
    getLogs,
    logAction
};
