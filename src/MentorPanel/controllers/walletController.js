const MentorProfile = require('../models/MentorProfile');
const PayoutRequest = require('../../shared/models/PayoutRequest');
const Payment = require('../../shared/models/Payment');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

/**
 * Get mentor wallet data (balance, payout methods, and request history)
 */
const getWalletData = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await MentorProfile.findOne({ userId });

        if (!profile) {
            return sendErrorResponse(res, 'Mentor profile not found', 404);
        }

        // --- DYNAMIC SYNC: Calculate actual balance from transactions ---
        // 1. All successful earnings
        const successfulPayments = await Payment.find({
            mentorId: userId,
            status: 'succeeded'
        });
        const totalEarnings = successfulPayments.reduce((sum, p) => sum + (p.mentorAmount || 0), 0);

        // 2. All payout requests
        const allPayouts = await PayoutRequest.find({ mentorId: userId });
        const totalWithdrawn = allPayouts
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);

        const pendingWithdrawals = allPayouts
            .filter(p => p.status === 'pending' || p.status === 'processing')
            .reduce((sum, p) => sum + p.amount, 0);

        // Current available balance is Earnings minus (Already Paid + Locked in Pending)
        const availableBalance = Math.max(0, totalEarnings - totalWithdrawn - pendingWithdrawals);

        // Sync with database if needed
        let needsUpdate = false;
        if (!profile.wallet) {
            profile.wallet = { availableBalance, totalWithdrawn, pendingEarnings: 0 };
            needsUpdate = true;
        } else if (
            profile.wallet.availableBalance !== availableBalance ||
            profile.wallet.totalWithdrawn !== totalWithdrawn
        ) {
            profile.wallet.availableBalance = availableBalance;
            profile.wallet.totalWithdrawn = totalWithdrawn;
            needsUpdate = true;
        }

        if (needsUpdate) {
            await profile.save();
        }
        // -------------------------------------------------------------

        const payoutRequests = await PayoutRequest.find({ mentorId: userId })
            .sort({ createdAt: -1 })
            .limit(20);

        return sendSuccessResponse(res, 'Wallet data retrieved', {
            wallet: {
                availableBalance,
                totalWithdrawn,
                totalEarnings, // Added for UI if needed
                pendingEarnings: profile.wallet.pendingEarnings || 0
            },
            payoutMethods: profile.payoutMethods || [],
            payoutRequests,
            recentEarnings: successfulPayments.slice(0, 10)
        });
    } catch (error) {
        console.error('Error getting wallet data:', error);
        return sendErrorResponse(res, 'Failed to retrieve wallet data', 500);
    }
};

/**
 * Add or update payout method
 */
const addPayoutMethod = async (req, res) => {
    try {
        const { type, bankName, country, accountNumber, accountTitle, isDefault } = req.body;

        if (!type || !bankName || !country || !accountNumber || !accountTitle) {
            return sendErrorResponse(res, 'All payout method details (including bank and country) are required', 400);
        }

        const profile = await MentorProfile.findOne({ userId: req.user.id });
        if (!profile) return sendErrorResponse(res, 'Profile not found', 404);

        // If making this default, unset others as default
        if (isDefault) {
            profile.payoutMethods.forEach(m => m.isDefault = false);
        }

        profile.payoutMethods.push({
            type,
            bankName,
            country,
            accountNumber,
            accountTitle,
            isDefault
        });
        await profile.save();

        return sendSuccessResponse(res, 'Payout method added successfully', {
            payoutMethods: profile.payoutMethods
        });
    } catch (error) {
        return sendErrorResponse(res, 'Failed to add payout method', 500);
    }
};

/**
 * Request a withdrawal
 */
const requestWithdrawal = async (req, res) => {
    try {
        const { amount, payoutMethodId } = req.body;
        const MIN_WITHDRAWAL = 50;

        if (!amount || amount < MIN_WITHDRAWAL) {
            return sendErrorResponse(res, `Minimum withdrawal amount is $${MIN_WITHDRAWAL}`, 400);
        }

        const profile = await MentorProfile.findOne({ userId: req.user.id });
        if (!profile) return sendErrorResponse(res, 'Profile not found', 404);

        if (profile.wallet.availableBalance < amount) {
            return sendErrorResponse(res, 'Insufficient balance', 400);
        }

        const method = profile.payoutMethods.id(payoutMethodId);
        if (!method) {
            return sendErrorResponse(res, 'Select a valid payout method', 400);
        }

        // --- Financial Calculation ---
        const platformFee = Math.round(amount * 0.20 * 100) / 100; // 20% System Commission
        const netAmount = amount - platformFee; // 80% Mentor Net

        // Create payout request
        const payoutRequest = new PayoutRequest({
            mentorId: req.user.id,
            amount, // Gross Requested
            platformFee,
            netAmount,
            payoutMethod: {
                type: method.type,
                bankName: method.bankName,
                country: method.country,
                accountNumber: method.accountNumber,
                accountTitle: method.accountTitle
            },
            status: 'pending'
        });

        // Deduct from wallet immediately to "lock" funds (Gross Amount)
        profile.wallet.availableBalance -= amount;

        await Promise.all([
            payoutRequest.save(),
            profile.save()
        ]);

        return sendSuccessResponse(res, 'Withdrawal request submitted', {
            payoutRequest,
            newBalance: profile.wallet.availableBalance
        });
    } catch (error) {
        console.error('Error requesting withdrawal:', error);
        return sendErrorResponse(res, 'Failed to submit withdrawal request', 500);
    }
};

/**
 * Delete payout method
 */
const deletePayoutMethod = async (req, res) => {
    try {
        const { id } = req.params;
        const profile = await MentorProfile.findOne({ userId: req.user.id });

        if (!profile) return sendErrorResponse(res, 'Profile not found', 404);

        profile.payoutMethods = profile.payoutMethods.filter(m => m._id.toString() !== id);
        await profile.save();

        return sendSuccessResponse(res, 'Payout method removed', {
            payoutMethods: profile.payoutMethods
        });
    } catch (error) {
        return sendErrorResponse(res, 'Failed to remove payout method', 500);
    }
};

/**
 * Update an existing payout method
 */
const updatePayoutMethod = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, bankName, country, accountNumber, accountTitle, isDefault } = req.body;

        const profile = await MentorProfile.findOne({ userId: req.user.id });
        if (!profile) return sendErrorResponse(res, 'Profile not found', 404);

        const method = profile.payoutMethods.id(id);
        if (!method) return sendErrorResponse(res, 'Payout method not found', 404);

        // Update fields
        if (type) method.type = type;
        if (bankName) method.bankName = bankName;
        if (country) method.country = country;
        if (accountNumber) method.accountNumber = accountNumber;
        if (accountTitle) method.accountTitle = accountTitle;

        if (isDefault !== undefined) {
            if (isDefault) {
                profile.payoutMethods.forEach(m => m.isDefault = false);
            }
            method.isDefault = isDefault;
        }

        await profile.save();

        return sendSuccessResponse(res, 'Payout method updated successfully', {
            payoutMethods: profile.payoutMethods
        });
    } catch (error) {
        console.error('Error updating payout method:', error);
        return sendErrorResponse(res, 'Failed to update payout method', 500);
    }
};

module.exports = {
    getWalletData,
    addPayoutMethod,
    requestWithdrawal,
    deletePayoutMethod,
    updatePayoutMethod
};
