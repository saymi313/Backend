const stripe = require('../config/stripe');
const Payment = require('../models/Payment');
const MentorService = require('../../MentorPanel/models/Service');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');

const ensureStripeWebhookConfigured = (res) => {
  if (!stripe) {
    res.status(503).json({ error: 'Stripe is not configured' });
    return false;
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ error: 'Stripe webhook secret is not configured' });
    return false;
  }

  return true;
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const createBookingFromPayment = async (paymentDoc) => {
  if (paymentDoc.bookingId) {
    return Booking.findById(paymentDoc.bookingId);
  }

  const getMetadataValue = (key) => {
    if (!paymentDoc.metadata) return null;
    return typeof paymentDoc.metadata.get === 'function'
      ? paymentDoc.metadata.get(key)
      : paymentDoc.metadata[key];
  };

  const serviceId = getMetadataValue('serviceId');
  const packageId = getMetadataValue('packageId');
  const scheduledDateString = getMetadataValue('scheduledDate');
  const durationString = getMetadataValue('duration');
  const notes = getMetadataValue('notes') || '';

  const service = await MentorService.findById(serviceId);
  if (!service) {
    throw new Error('Service not found while creating booking');
  }

  const selectedPackage = packageId ? service.packages.id(packageId) : service.packages[0];
  if (!selectedPackage) {
    throw new Error('Package not found while creating booking');
  }

  const scheduledDate = parseDate(scheduledDateString) || new Date(Date.now() + 24 * 60 * 60 * 1000);
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
    title: 'Payment received',
    message: `You received $${paymentDoc.amount} for ${service.title}.`,
    data: {
      bookingId: booking._id,
      serviceId: service._id,
      paymentId: paymentDoc._id.toString(),
    },
    priority: 'high',
  });

  // Send payment confirmation email to mentor
  try {
    const emailService = require('../services/emailService');
    const User = require('../models/User');
    const mentor = await User.findById(paymentDoc.mentorId).select('profile email');
    const mentee = await User.findById(paymentDoc.menteeId).select('profile');

    if (mentor && mentor.email && mentee) {
      const mentorName = `${mentor.profile.firstName} ${mentor.profile.lastName}`;
      const menteeName = `${mentee.profile.firstName} ${mentee.profile.lastName}`;

      await emailService.sendPaymentConfirmationEmail(
        mentor.email,
        mentorName,
        paymentDoc.amount,
        service.title,
        menteeName,
        booking._id.toString()
      );
      console.log('✅ Payment confirmation email sent to mentor');
    }
  } catch (emailError) {
    console.error('⚠️ Failed to send payment confirmation email (continuing):', emailError.message);
    // Don't fail the request if email fails
  }

  await Notification.createNotification({
    userId: paymentDoc.menteeId,
    type: 'payment_successful',
    title: 'Booking confirmed',
    message: `Your payment for ${service.title} succeeded and the booking is confirmed.`,
    data: {
      bookingId: booking._id,
      serviceId: service._id,
      paymentId: paymentDoc._id.toString(),
    },
    priority: 'medium',
  });

  return booking;
};

const handleCheckoutCompleted = async (session) => {
  const payment = await Payment.findOne({ stripeSessionId: session.id });
  if (!payment) {
    return;
  }

  payment.status = 'processing';
  payment.stripePaymentIntentId = session.payment_intent;
  await payment.save();
};

const handleCheckoutExpired = async (session) => {
  const payment = await Payment.findOne({ stripeSessionId: session.id });
  if (!payment) {
    return;
  }

  if (payment.status === 'pending') {
    payment.status = 'cancelled';
    await payment.save();
  }
};

const handlePaymentSucceeded = async (paymentIntent) => {
  const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });
  if (!payment) {
    return;
  }

  if (payment.status !== 'succeeded') {
    payment.status = 'succeeded';
    await payment.save();
  }

  if (!payment.bookingId) {
    try {
      await createBookingFromPayment(payment);
    } catch (error) {
      console.error('Failed to create booking from payment intent success:', error);
    }
  }
};

const handlePaymentFailed = async (paymentIntent) => {
  const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });
  if (!payment) {
    return;
  }

  payment.status = 'failed';
  await payment.save();

  await Notification.createNotification({
    userId: payment.menteeId,
    type: 'payment_failed',
    title: 'Payment failed',
    message: 'Your payment could not be processed. Please try again.',
    data: {
      paymentId: payment._id.toString(),
    },
    priority: 'high',
  });
};

const handleStripeWebhook = async (req, res) => {
  if (!ensureStripeWebhookConfigured(res)) return;

  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

module.exports = {
  handleStripeWebhook,
};

