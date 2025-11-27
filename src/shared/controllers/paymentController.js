const stripe = require('../config/stripe');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const MentorService = require('../../MentorPanel/models/Service');
const User = require('../models/User');
const { USER_ROLES } = require('../utils/constants/roles');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/helpers/responseHelpers');

const ensureStripeConfigured = (res) => {
  if (!stripe) {
    sendErrorResponse(res, 'Payment processing is not configured. Please contact support.', 503);
    return false;
  }
  return true;
};

const getSuccessUrl = () =>
  process.env.STRIPE_SUCCESS_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`;

const getCancelUrl = () =>
  process.env.STRIPE_CANCEL_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`;

const parseScheduledDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const createCheckoutSession = async (req, res) => {
  if (!ensureStripeConfigured(res)) return;

  try {
    const {
      serviceId,
      packageId,
      scheduledDate,
      duration,
      notes = '',
    } = req.body;
    const menteeId = req.user.id;

    if (!serviceId || !packageId || !scheduledDate) {
      return sendErrorResponse(res, 'Service, package, and scheduled date are required', 400);
    }

    const scheduledDateObj = parseScheduledDate(scheduledDate);
    if (!scheduledDateObj || scheduledDateObj <= new Date()) {
      return sendErrorResponse(res, 'Scheduled date must be a valid future date', 400);
    }

    const service = await MentorService.findOne({
      _id: serviceId,
      status: 'approved',
      isActive: true,
    }).populate('mentorId', 'profile.firstName profile.lastName email');

    if (!service) {
      return sendErrorResponse(res, 'Service not found or unavailable', 404);
    }

    const selectedPackage = service.packages.id(packageId);
    if (!selectedPackage) {
      return sendErrorResponse(res, 'Selected package not found', 404);
    }

    if (!selectedPackage.price || selectedPackage.price <= 0) {
      return sendErrorResponse(res, 'Package price must be greater than zero', 400);
    }

    const mentee = await User.findById(menteeId).select('email profile firstName lastName stripeCustomerId role');
    if (!mentee) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    if (mentee.role !== USER_ROLES.MENTEE) {
      return sendErrorResponse(res, 'Only mentees can purchase services', 403);
    }

    const amountInCents = Math.round(selectedPackage.price * 100);
    const platformFeePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || 10);
    const platformFeeInCents = Math.round((amountInCents * platformFeePercentage) / 100);
    const mentorAmountInCents = amountInCents - platformFeeInCents;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountInCents,
            product_data: {
              name: service.title,
              description: `${selectedPackage.name} package`,
              metadata: {
                serviceId: service._id.toString(),
                packageId: selectedPackage._id.toString(),
              },
            },
          },
          quantity: 1,
        },
      ],
      customer_email: mentee.email,
      client_reference_id: `${service._id.toString()}::${selectedPackage._id.toString()}`,
      metadata: {
        menteeId: menteeId,
        mentorId: service.mentorId?._id?.toString() || service.mentorId?.toString(),
        serviceId: service._id.toString(),
        packageId: selectedPackage._id.toString(),
        scheduledDate: scheduledDateObj.toISOString(),
        duration: duration ? String(duration) : '',
        notes,
      },
      success_url: `${getSuccessUrl()}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getCancelUrl()}?service_id=${service._id.toString()}&package_id=${selectedPackage._id.toString()}`,
    });

    const payment = new Payment({
      menteeId,
      mentorId: service.mentorId?._id || service.mentorId,
      serviceId: service._id,
      serviceTitle: service.title,
      packageId: selectedPackage._id.toString(),
      packageName: selectedPackage.name,
      amount: selectedPackage.price,
      currency: 'usd',
      platformFee: platformFeeInCents / 100,
      mentorAmount: mentorAmountInCents / 100,
      stripeSessionId: session.id,
      status: 'pending',
      metadata: {
        serviceId: service._id.toString(),
        packageId: selectedPackage._id.toString(),
        scheduledDate: scheduledDateObj.toISOString(),
        duration: duration ? String(duration) : '',
        notes,
      },
    });

    await payment.save();

    return sendSuccessResponse(res, 'Checkout session created', {
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return sendErrorResponse(res, 'Failed to create checkout session', 500);
  }
};

const createBookingFromPayment = async (paymentDoc) => {
  const serviceId = paymentDoc.metadata?.get
    ? paymentDoc.metadata.get('serviceId')
    : paymentDoc.metadata?.serviceId;
  const packageId = paymentDoc.metadata?.get
    ? paymentDoc.metadata.get('packageId')
    : paymentDoc.metadata?.packageId;
  const scheduledDateString = paymentDoc.metadata?.get
    ? paymentDoc.metadata.get('scheduledDate')
    : paymentDoc.metadata?.scheduledDate;
  const durationString = paymentDoc.metadata?.get
    ? paymentDoc.metadata.get('duration')
    : paymentDoc.metadata?.duration;
  const notes = paymentDoc.metadata?.get
    ? paymentDoc.metadata.get('notes')
    : paymentDoc.metadata?.notes || '';

  const service = await MentorService.findById(serviceId);
  if (!service) {
    throw new Error('Service not found while creating booking');
  }

  const selectedPackage = packageId ? service.packages.id(packageId) : service.packages[0];
  if (!selectedPackage) {
    throw new Error('Package not found while creating booking');
  }

  const scheduledDate = parseScheduledDate(scheduledDateString) || new Date(Date.now() + 24 * 60 * 60 * 1000);
  const duration = durationString ? parseInt(durationString, 10) : parseInt(selectedPackage.duration, 10) || 60;

  const booking = new Booking({
    menteeId: paymentDoc.menteeId,
    mentorId: paymentDoc.mentorId,
    serviceId: service._id,
    packageId: selectedPackage._id.toString(),
    scheduledDate,
    duration,
    totalAmount: paymentDoc.amount,
    paymentStatus: 'paid',
    status: 'confirmed',
    notes,
    menteeNotes: notes,
  });

  await booking.save();

  paymentDoc.bookingId = booking._id;
  await paymentDoc.save();

  await Notification.createNotification({
    userId: paymentDoc.mentorId,
    type: 'payment_successful',
    title: 'New payment received',
    message: `You received $${paymentDoc.amount} for ${service.title}.`,
    data: {
      bookingId: booking._id,
      serviceId: service._id,
      paymentId: paymentDoc._id.toString(),
    },
    priority: 'high',
    actionUrl: `/mentor/bookings/${booking._id}`,
    actionText: 'View booking',
  });

  await Notification.createNotification({
    userId: paymentDoc.menteeId,
    type: 'payment_successful',
    title: 'Payment confirmed',
    message: `Your payment for ${service.title} was successful. Your booking is confirmed.`,
    data: {
      bookingId: booking._id,
      serviceId: service._id,
      paymentId: paymentDoc._id.toString(),
    },
    priority: 'medium',
    actionUrl: `/mentees/bookings/${booking._id}`,
    actionText: 'View booking',
  });

  return booking;
};

const verifySession = async (req, res) => {
  if (!ensureStripeConfigured(res)) return;

  try {
    const { sessionId } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    if (!sessionId) {
      return sendErrorResponse(res, 'Session ID is required', 400);
    }

    const payment = await Payment.findOne({ stripeSessionId: sessionId });
    if (!payment) {
      return sendErrorResponse(res, 'Payment not found for this session', 404);
    }

    const isOwner = payment.menteeId.toString() === requesterId;
    if (!isOwner && requesterRole !== USER_ROLES.ADMIN) {
      return sendErrorResponse(res, 'You are not authorized to view this payment', 403);
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid' && payment.status !== 'succeeded') {
      payment.status = 'succeeded';
      payment.stripePaymentIntentId = session.payment_intent;
      await payment.save();

      if (!payment.bookingId) {
        try {
          await createBookingFromPayment(payment);
        } catch (bookingError) {
          console.error('Error creating booking from payment:', bookingError);
        }
      }
    } else if (session.payment_status === 'unpaid' && payment.status === 'pending') {
      payment.status = 'failed';
      await payment.save();
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate('bookingId')
      .populate('menteeId', 'profile.firstName profile.lastName email')
      .populate('mentorId', 'profile.firstName profile.lastName email');

    return sendSuccessResponse(res, 'Session verified', {
      payment: populatedPayment,
      sessionStatus: session.payment_status,
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    return sendErrorResponse(res, 'Failed to verify session', 500);
  }
};

const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { id: requesterId, role } = req.user;

    const payment = await Payment.findById(paymentId)
      .populate('bookingId')
      .populate('menteeId', 'profile.firstName profile.lastName email')
      .populate('mentorId', 'profile.firstName profile.lastName email');

    if (!payment) {
      return sendErrorResponse(res, 'Payment not found', 404);
    }

    const isOwner =
      payment.menteeId?._id?.toString() === requesterId ||
      payment.mentorId?._id?.toString() === requesterId;
    const isAdmin = role === USER_ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      return sendErrorResponse(res, 'You are not authorized to view this payment', 403);
    }

    return sendSuccessResponse(res, 'Payment details retrieved', { payment });
  } catch (error) {
    console.error('Error getting payment details:', error);
    return sendErrorResponse(res, 'Failed to retrieve payment details', 500);
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const { id: requesterId, role } = req.user;

    const query = {};
    if (role === USER_ROLES.MENTEE) {
      query.menteeId = requesterId;
    } else if (role === USER_ROLES.MENTOR) {
      query.mentorId = requesterId;
    } else if (role === USER_ROLES.ADMIN) {
      if (req.query.menteeId) {
        query.menteeId = req.query.menteeId;
      }
      if (req.query.mentorId) {
        query.mentorId = req.query.mentorId;
      }
    } else {
      return sendErrorResponse(res, 'Role not supported for payment history', 403);
    }

    if (status) {
      query.status = status;
    }

    const numericLimit = Math.min(parseInt(limit, 10) || 10, 50);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    const payments = await Payment.find(query)
      .populate('bookingId')
      .populate('menteeId', 'profile.firstName profile.lastName email')
      .populate('mentorId', 'profile.firstName profile.lastName email')
      .sort({ createdAt: -1 })
      .limit(numericLimit)
      .skip((numericPage - 1) * numericLimit);

    const total = await Payment.countDocuments(query);

    return sendSuccessResponse(res, 'Payment history retrieved', {
      payments,
      pagination: {
        current: numericPage,
        pages: Math.ceil(total / numericLimit),
        total,
      },
    });
  } catch (error) {
    console.error('Error getting payment history:', error);
    return sendErrorResponse(res, 'Failed to retrieve payment history', 500);
  }
};

const refundPayment = async (req, res) => {
  if (!ensureStripeConfigured(res)) return;

  try {
    const { paymentId } = req.params;
    const { reason = 'requested_by_customer' } = req.body || {};
    const { id: requesterId, role } = req.user;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return sendErrorResponse(res, 'Payment not found', 404);
    }

    const isOwner = payment.menteeId.toString() === requesterId;
    const isAdmin = role === USER_ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      return sendErrorResponse(res, 'You are not authorized to refund this payment', 403);
    }

    if (payment.status === 'refunded') {
      return sendErrorResponse(res, 'Payment has already been refunded', 400);
    }

    if (payment.status !== 'succeeded') {
      return sendErrorResponse(res, 'Only successful payments can be refunded', 400);
    }

    if (!payment.stripePaymentIntentId) {
      return sendErrorResponse(res, 'Payment intent not found for this payment', 400);
    }

    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      reason,
    });

    payment.status = 'refunded';
    payment.refundId = refund.id;
    payment.refundAmount = refund.amount / 100;
    payment.refundReason = reason;
    await payment.save();

    if (payment.bookingId) {
      const booking = await Booking.findById(payment.bookingId);
      if (booking) {
        booking.status = 'cancelled';
        booking.paymentStatus = 'refunded';
        booking.cancellationReason = reason;
        booking.cancelledAt = new Date();
        await booking.save();
      }
    }

    await Notification.createNotification({
      userId: payment.mentorId,
      type: 'payment_failed',
      title: 'Payment refunded',
      message: 'A payment linked to one of your services was refunded.',
      data: {
        paymentId: payment._id.toString(),
        bookingId: payment.bookingId,
      },
      priority: 'medium',
    });

    await Notification.createNotification({
      userId: payment.menteeId,
      type: 'payment_successful',
      title: 'Refund processed',
      message: 'Your refund has been processed successfully.',
      data: {
        paymentId: payment._id.toString(),
        bookingId: payment.bookingId,
      },
      priority: 'medium',
    });

    return sendSuccessResponse(res, 'Payment refunded successfully', { payment });
  } catch (error) {
    console.error('Error refunding payment:', error);
    return sendErrorResponse(res, 'Failed to refund payment', 500);
  }
};

module.exports = {
  createCheckoutSession,
  verifySession,
  getPaymentDetails,
  getPaymentHistory,
  refundPayment,
};

