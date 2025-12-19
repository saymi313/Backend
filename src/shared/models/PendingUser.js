const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const pendingUserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 8,
        select: false
    },
    role: {
        type: String,
        required: true,
        enum: ['mentee', 'mentor']
    },
    profile: {
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            trim: true
        }
    },
    verificationOTP: {
        type: String,
        required: true
    },
    verificationOTPExpires: {
        type: Date,
        required: true
    },
    mentorApprovalStatus: {
        type: String,
        enum: ['pending', null],
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
}, {
    timestamps: true
});

// Index for efficient queries
pendingUserSchema.index({ email: 1 });
pendingUserSchema.index({ verificationOTP: 1, email: 1 });

// TTL index to auto-delete expired pending users after 24 hours
pendingUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Hash password before saving
pendingUserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to check if OTP is expired
pendingUserSchema.methods.isOTPExpired = function () {
    return new Date() > this.verificationOTPExpires;
};

// Static method to create pending user (replaces existing if duplicate email)
pendingUserSchema.statics.createPendingUser = async function (userData) {
    // Delete any existing pending user with this email
    await this.deleteMany({ email: userData.email.toLowerCase() });

    // Create new pending user
    return await this.create(userData);
};

module.exports = mongoose.model('PendingUser', pendingUserSchema);
