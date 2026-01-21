const mongoose = require('mongoose');

const payoutRequestSchema = new mongoose.Schema({
    mentorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: [true, 'Payout amount is required'],
        min: [50, 'Minimum withdrawal amount is $50']
    },
    platformFee: {
        type: Number,
        default: 0
    },
    netAmount: {
        type: Number,
        default: 0
    },
    payoutMethod: {
        type: {
            type: String,
            enum: ['Bank Transfer'],
            required: true,
            default: 'Bank Transfer'
        },
        bankName: String,
        country: String,
        accountNumber: String,
        accountTitle: String
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'rejected'],
        default: 'pending',
        index: true
    },
    receiptImage: {
        type: String // URL or path to the payment proof screenshot
    },
    adminNotes: {
        type: String,
        trim: true
    },
    processedAt: {
        type: Date
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PayoutRequest', payoutRequestSchema);
