const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    menteeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MentorService',
      required: true,
    },
    serviceTitle: {
      type: String,
      trim: true,
      default: '',
    },
    packageId: {
      type: String,
      required: true,
      trim: true,
    },
    packageName: {
      type: String,
      trim: true,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be greater than zero'],
    },
    currency: {
      type: String,
      default: 'usd',
      uppercase: true,
      trim: true,
    },
    platformFee: {
      type: Number,
      required: true,
      min: [0, 'Platform fee cannot be negative'],
    },
    mentorAmount: {
      type: Number,
      required: true,
      min: [0, 'Mentor amount cannot be negative'],
    },
    stripeSessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    stripePaymentIntentId: {
      type: String,
      default: null,
      trim: true,
    },
    stripeChargeId: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    refundId: {
      type: String,
      default: null,
      trim: true,
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: [0, 'Refund amount cannot be negative'],
    },
    refundReason: {
      type: String,
      default: null,
      trim: true,
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ menteeId: 1 });
paymentSchema.index({ mentorId: 1 });
paymentSchema.index({ serviceId: 1 });
paymentSchema.index({ stripeSessionId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

