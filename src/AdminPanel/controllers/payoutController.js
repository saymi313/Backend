const PayoutRequest = require('../../shared/models/PayoutRequest');
const MentorProfile = require('../../MentorPanel/models/MentorProfile');
const Notification = require('../../shared/models/Notification');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

/**
 * Get all payout requests with filters and pagination
 */
const getAllPayouts = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const query = {};
        if (status) query.status = status;

        const skip = (page - 1) * limit;

        const payouts = await PayoutRequest.find(query)
            .populate('mentorId', 'profile.firstName profile.lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await PayoutRequest.countDocuments(query);

        return sendSuccessResponse(res, 'Payout requests retrieved', {
            payouts,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return sendErrorResponse(res, 'Failed to retrieve payouts', 500);
    }
};

/**
 * Mark payout as completed (Manual flow)
 */
const completePayout = async (req, res) => {
    try {
        const { id } = req.params;
        const { receiptImage, adminNotes } = req.body;

        const payout = await PayoutRequest.findById(id);
        if (!payout) return sendErrorResponse(res, 'Payout request not found', 404);

        if (payout.status === 'completed') {
            return sendErrorResponse(res, 'Payout is already marked as completed', 400);
        }

        // Update status
        payout.status = 'completed';
        payout.receiptImage = receiptImage;
        payout.adminNotes = adminNotes;
        payout.processedAt = new Date();
        payout.processedBy = req.user.id;

        // Increment mentor's total withdrawn
        const profile = await MentorProfile.findOne({ userId: payout.mentorId });
        if (profile) {
            profile.wallet.totalWithdrawn += payout.amount;
            await profile.save();
        }

        await payout.save();

        // Create notification for mentor
        const netDisbursed = payout.netAmount || (payout.amount * 0.8); // Fallback for legacy requests
        await Notification.create({
            userId: payout.mentorId,
            type: 'payout_completed',
            title: 'Withdrawal Successfully Disbursed',
            message: `A net amount of $${netDisbursed.toFixed(2)} has been successfully sent to your account. (Gross request: $${payout.amount.toFixed(2)}, Platform Fee: $${(payout.amount - netDisbursed).toFixed(2)})`,
            priority: 'medium',
            actionUrl: '/mentor/wallet'
        });

        return sendSuccessResponse(res, 'Payout marked as completed successfully', { payout });
    } catch (error) {
        return sendErrorResponse(res, 'Failed to complete payout', 500);
    }
};

/**
 * Reject payout request and refund balance
 */
const rejectPayout = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;

        const payout = await PayoutRequest.findById(id);
        if (!payout) return sendErrorResponse(res, 'Payout request not found', 404);

        if (payout.status !== 'pending' && payout.status !== 'processing') {
            return sendErrorResponse(res, `Cannot reject a ${payout.status} request`, 400);
        }

        // Refund mentor wallet
        const profile = await MentorProfile.findOne({ userId: payout.mentorId });
        if (profile) {
            profile.wallet.availableBalance += payout.amount;
            await profile.save();
        }

        payout.status = 'rejected';
        payout.adminNotes = adminNotes;
        payout.processedAt = new Date();
        payout.processedBy = req.user.id;
        await payout.save();

        // Create notification for mentor
        await Notification.create({
            userId: payout.mentorId,
            type: 'payout_rejected',
            title: 'Payout Request Rejected',
            message: `Your withdrawal request for $${payout.amount.toFixed(2)} was rejected. Reason: ${adminNotes}. Funds have been returned to your wallet.`,
            priority: 'high',
            actionUrl: '/mentor/wallet'
        });

        return sendSuccessResponse(res, 'Payout request rejected and funds refunded', { payout });
    } catch (error) {
        return sendErrorResponse(res, 'Failed to reject payout', 500);
    }
};

module.exports = {
    getAllPayouts,
    completePayout,
    rejectPayout
};
