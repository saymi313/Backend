const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
    who: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    actorName: {
        type: String,
        required: true
    },
    actorEmail: {
        type: String,
        required: true
    },
    action: {
        type: String, // e.g., "Created Admin", "Updated Settings"
        required: true
    },
    details: {
        type: String, // Additional context/details
        default: ''
    },
    ip: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 30 // Auto-delete logs after 30 days (optional, keeping DB clean)
    }
});

// Index for faster queries
adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ who: 1 });
adminLogSchema.index({ action: 1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
