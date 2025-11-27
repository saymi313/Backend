# Stripe Payment Integration for Mentor Services
## Complete Implementation Guide

---

## 🎯 PAYMENT FLOW OPTIONS

### Option 1: Embedded Payment (Stays on your site) - RECOMMENDED
**Flow:** Browse → Book → Pay (modal) → Success
**Time:** 14-19 hours
**UX:** Seamless, professional

### Option 2: Stripe Checkout (Redirects to Stripe) - QUICK START
**Flow:** Browse → Book → Stripe Page → Redirect Back
**Time:** 6-8 hours
**UX:** Fast implementation, slightly disruptive

---

## 🚀 QUICK START: Stripe Checkout Implementation (6-8 hours)

### PHASE 1: Backend Setup (2-3 hours)

#### Step 1.1: Install Dependencies
```bash
cd Backend
npm install stripe
```

#### Step 1.2: Environment Configuration
**File:** `Backend/.env`
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:3000/payment/success
STRIPE_CANCEL_URL=http://localhost:3000/payment/cancel
PLATFORM_FEE_PERCENTAGE=10
```

#### Step 1.3: Create Stripe Config
**File:** `Backend/src/shared/config/stripe.js`
```javascript
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  Stripe secret key not configured');
}

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    })
  : null;

module.exports = stripe;
```

#### Step 1.4: Create Payment Model
**File:** `Backend/src/shared/models/Payment.js`
```javascript
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  menteeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'usd'
  },
  platformFee: {
    type: Number,
    required: true
  },
  mentorAmount: {
    type: Number,
    required: true
  },
  stripeSessionId: {
    type: String,
    required: true,
    unique: true
  },
  stripePaymentIntentId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  refundId: {
    type: String,
    default: null
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, {
  timestamps: true
});

paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ menteeId: 1 });
paymentSchema.index({ mentorId: 1 });
paymentSchema.index({ stripeSessionId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
```

#### Step 1.5: Update User Model
**File:** `Backend/src/shared/models/User.js`

Add these fields to the user schema:
```javascript
stripeCustomerId: {
  type: String,
  default: null,
  sparse: true
}
```

---

### PHASE 2: Payment Controller (2-3 hours)

**File:** `Backend/src/shared/controllers/paymentController.js`
```javascript
const stripe = require('../config/stripe');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const User = require('../models/User');
const MentorService = require('../../MentorPanel/models/Service');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/helpers/responseHelpers');

// Create Stripe Checkout Session
const createCheckoutSession = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const menteeId = req.user.id;

    if (!stripe) {
      return sendErrorResponse(res, 'Payment processing is not configured', 503);
    }

    // Get booking with service details
    const booking = await Booking.findById(bookingId)
      .populate('serviceId')
      .populate('mentorId', 'profile email');

    if (!booking) {
      return sendErrorResponse(res, 'Booking not found', 404);
    }

    if (booking.menteeId.toString() !== menteeId) {
      return sendErrorResponse(res, 'Unauthorized', 403);
    }

    if (booking.paymentStatus === 'paid') {
      return sendErrorResponse(res, 'Booking already paid', 400);
    }

    // Get mentee details
    const mentee = await User.findById(menteeId);

    // Calculate fees
    const platformFeePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || 10);
    const amount = booking.totalAmount;
    const platformFee = (amount * platformFeePercentage) / 100;
    const mentorAmount = amount - platformFee;

    // Create Stripe Checkout Session
    const successUrl = process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/payment/success';
    const cancelUrl = process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/payment/cancel';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: booking.serviceId.title,
              description: `Mentorship session with ${booking.mentorId.profile?.firstName} ${booking.mentorId.profile?.lastName}`,
              images: booking.serviceId.images?.length > 0 ? [booking.serviceId.images[0]] : [],
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: mentee.email,
      client_reference_id: bookingId,
      metadata: {
        bookingId: bookingId,
        menteeId: menteeId,
        mentorId: booking.mentorId._id.toString(),
        platformFee: platformFee.toString(),
        mentorAmount: mentorAmount.toString()
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}?booking_id=${bookingId}`,
    });

    // Create payment record
    const payment = new Payment({
      bookingId: booking._id,
      menteeId,
      mentorId: booking.mentorId._id,
      amount,
      currency: 'usd',
      platformFee,
      mentorAmount,
      stripeSessionId: session.id,
      status: 'pending',
      metadata: {
        serviceTitle: booking.serviceId.title
      }
    });

    await payment.save();

    // Update booking
    booking.paymentId = payment._id.toString();
    await booking.save();

    return sendSuccessResponse(res, 'Checkout session created', {
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return sendErrorResponse(res, 'Failed to create checkout session', 500);
  }
};

// Verify Payment Session
const verifySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!stripe) {
      return sendErrorResponse(res, 'Payment processing is not configured', 503);
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const payment = await Payment.findOne({ stripeSessionId: sessionId })
      .populate('bookingId');

    if (!payment) {
      return sendErrorResponse(res, 'Payment not found', 404);
    }

    // Check authorization
    if (payment.menteeId.toString() !== userId) {
      return sendErrorResponse(res, 'Unauthorized', 403);
    }

    // Update payment if completed
    if (session.payment_status === 'paid' && payment.status !== 'succeeded') {
      payment.status = 'succeeded';
      payment.stripePaymentIntentId = session.payment_intent;
      await payment.save();

      // Update booking
      const booking = await Booking.findById(payment.bookingId);
      if (booking) {
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed';
        await booking.save();
      }
    }

    return sendSuccessResponse(res, 'Session verified', {
      payment,
      sessionStatus: session.payment_status,
      booking: payment.bookingId
    });

  } catch (error) {
    console.error('Error verifying session:', error);
    return sendErrorResponse(res, 'Failed to verify session', 500);
  }
};

// Get Payment Details
const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findById(paymentId)
      .populate('bookingId')
      .populate('menteeId', 'profile email')
      .populate('mentorId', 'profile email');

    if (!payment) {
      return sendErrorResponse(res, 'Payment not found', 404);
    }

    // Check authorization
    if (payment.menteeId._id.toString() !== userId && payment.mentorId._id.toString() !== userId) {
      return sendErrorResponse(res, 'Unauthorized', 403);
    }

    return sendSuccessResponse(res, 'Payment details retrieved', { payment });

  } catch (error) {
    console.error('Error getting payment details:', error);
    return sendErrorResponse(res, 'Failed to retrieve payment details', 500);
  }
};

// Get Payment History
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    const user = await User.findById(userId);

    const query = user.role === 'mentee' 
      ? { menteeId: userId } 
      : { mentorId: userId };

    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .populate('bookingId')
      .populate('menteeId', 'profile email')
      .populate('mentorId', 'profile email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    return sendSuccessResponse(res, 'Payment history retrieved', {
      payments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error getting payment history:', error);
    return sendErrorResponse(res, 'Failed to retrieve payment history', 500);
  }
};

// Refund Payment (Admin only)
const refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!stripe) {
      return sendErrorResponse(res, 'Payment processing is not configured', 503);
    }

    const user = await User.findById(userId);
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return sendErrorResponse(res, 'Payment not found', 404);
    }

    // Only admin or mentee can refund
    if (user.role !== 'admin' && payment.menteeId.toString() !== userId) {
      return sendErrorResponse(res, 'Unauthorized', 403);
    }

    if (payment.status === 'refunded') {
      return sendErrorResponse(res, 'Payment already refunded', 400);
    }

    if (payment.status !== 'succeeded') {
      return sendErrorResponse(res, 'Can only refund successful payments', 400);
    }

    // Get the payment intent from the session
    const session = await stripe.checkout.sessions.retrieve(payment.stripeSessionId);
    
    if (!session.payment_intent) {
      return sendErrorResponse(res, 'Payment intent not found', 404);
    }

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: session.payment_intent,
      reason: reason || 'requested_by_customer',
    });

    // Update payment record
    payment.status = 'refunded';
    payment.refundId = refund.id;
    payment.refundAmount = refund.amount / 100;
    await payment.save();

    // Update booking
    const booking = await Booking.findById(payment.bookingId);
    if (booking) {
      booking.paymentStatus = 'refunded';
      booking.status = 'cancelled';
      booking.cancellationReason = reason || 'Payment refunded';
      await booking.save();
    }

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
  refundPayment
};
```

---

### PHASE 3: Webhook Handler (1-2 hours)

**File:** `Backend/src/shared/controllers/webhookController.js`
```javascript
const stripe = require('../config/stripe');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');

const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.warn('Webhook not configured');
    return res.status(400).json({ error: 'Webhook not configured' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object);
        break;

      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'charge.refunded':
        console.log('Refund processed:', event.data.object.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

async function handleCheckoutComplete(session) {
  console.log('Checkout completed:', session.id);

  const payment = await Payment.findOne({ stripeSessionId: session.id });

  if (!payment) {
    console.error('Payment not found for session:', session.id);
    return;
  }

  payment.status = 'processing';
  payment.stripePaymentIntentId = session.payment_intent;
  await payment.save();
}

async function handlePaymentSuccess(paymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);

  const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });

  if (!payment) {
    console.error('Payment not found for paymentIntent:', paymentIntent.id);
    return;
  }

  payment.status = 'succeeded';
  await payment.save();

  // Update booking
  const booking = await Booking.findById(payment.bookingId)
    .populate('serviceId');

  if (booking) {
    booking.paymentStatus = 'paid';
    booking.status = 'confirmed';
    await booking.save();

    // Notify mentor
    await Notification.createNotification({
      userId: booking.mentorId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `Payment of $${payment.amount} received for "${booking.serviceId.title}".`,
      data: { 
        bookingId: booking._id.toString(), 
        paymentId: payment._id.toString() 
      },
      priority: 'high',
      actionUrl: `/mentor/bookings/${booking._id}`,
      actionText: 'View Booking'
    });

    // Notify mentee
    await Notification.createNotification({
      userId: booking.menteeId,
      type: 'payment_confirmed',
      title: 'Payment Confirmed',
      message: `Your payment for "${booking.serviceId.title}" was successful!`,
      data: { bookingId: booking._id.toString() },
      priority: 'normal',
      actionUrl: `/bookings/${booking._id}`,
      actionText: 'View Booking'
    });
  }
}

async function handlePaymentFailed(paymentIntent) {
  console.log('Payment failed:', paymentIntent.id);

  const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });

  if (!payment) return;

  payment.status = 'failed';
  await payment.save();

  const booking = await Booking.findById(payment.bookingId);
  if (booking) {
    booking.paymentStatus = 'failed';

    await Notification.createNotification({
      userId: booking.menteeId,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: 'Your payment failed. Please try again.',
      data: { bookingId: booking._id.toString() },
      priority: 'high',
      actionUrl: `/bookings/${booking._id}`,
      actionText: 'Retry Payment'
    });
  }
}

async function handleCheckoutExpired(session) {
  console.log('Checkout expired:', session.id);

  const payment = await Payment.findOne({ stripeSessionId: session.id });

  if (payment && payment.status === 'pending') {
    payment.status = 'cancelled';
    await payment.save();
  }
}

module.exports = { handleStripeWebhook };
```

---

### PHASE 4: Routes (30 minutes)

**File:** `Backend/src/shared/routes/paymentRoutes.js`
```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const {
  createCheckoutSession,
  verifySession,
  getPaymentDetails,
  getPaymentHistory,
  refundPayment
} = require('../controllers/paymentController');

router.use(authenticate);

router.post('/create-checkout-session', createCheckoutSession);
router.get('/verify-session/:sessionId', verifySession);
router.get('/details/:paymentId', getPaymentDetails);
router.get('/history', getPaymentHistory);
router.post('/refund/:paymentId', refundPayment);

module.exports = router;
```

**File:** `Backend/src/shared/routes/webhookRoutes.js`
```javascript
const express = require('express');
const router = express.Router();
const { handleStripeWebhook } = require('../controllers/webhookController');

// Webhook route (no auth, needs raw body)
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

module.exports = router;
```

**Update:** `Backend/app.js`
```javascript
// Add BEFORE body parser middleware
app.use('/api/webhooks', require('./src/shared/routes/webhookRoutes'));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add with other routes
app.use('/api/payments', require('./src/shared/routes/paymentRoutes'));
```

---

### PHASE 5: Frontend Setup (2-3 hours)

#### Step 5.1: Update API Functions
**File:** `Frontend/src/utils/api.js`
```javascript
// Payment API
export const paymentAPI = {
  createCheckoutSession: (bookingId) => api.post('/payments/create-checkout-session', { bookingId }),
  verifySession: (sessionId) => api.get(`/payments/verify-session/${sessionId}`),
  getPaymentDetails: (paymentId) => api.get(`/payments/details/${paymentId}`),
  getPaymentHistory: (params) => api.get('/payments/history', { params }),
  refundPayment: (paymentId, reason) => api.post(`/payments/refund/${paymentId}`, { reason }),
};
```

#### Step 5.2: Update BookingModal
**File:** `Frontend/src/MenteesPanel/components/BookingComponents/BookingModal.jsx`

Update the `handleSubmit` function:
```javascript
import { paymentAPI } from '../../../utils/api';

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!service) return;

  setLoading(true);
  setError('');

  try {
    // Create booking first
    const bookingResponse = await bookingAPI.create({
      serviceId: service._id,
      packageId: service.packages[0]._id,
      scheduledDate: formData.scheduledDate,
      duration: formData.duration,
      notes: formData.notes
    });

    if (bookingResponse.data && bookingResponse.data.success) {
      const booking = bookingResponse.data.data.booking;
      
      // Create Stripe checkout session
      const paymentResponse = await paymentAPI.createCheckoutSession(booking._id);
      
      if (paymentResponse.data && paymentResponse.data.success) {
        // Redirect to Stripe Checkout
        window.location.href = paymentResponse.data.data.url;
      } else {
        setError(paymentResponse.data?.message || 'Failed to create payment session');
      }
    } else {
      setError(bookingResponse.data?.message || 'Failed to create booking');
    }
  } catch (error) {
    console.error('Error:', error);
    setError('Failed to process request. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

#### Step 5.3: Create Success Page
**File:** `Frontend/src/pages/PaymentSuccess.jsx`
```javascript
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { paymentAPI } from '../utils/api';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (sessionId) {
      verifyPayment(sessionId);
    } else {
      setError('Invalid payment session');
      setLoading(false);
    }
  }, [searchParams]);

  const verifyPayment = async (sessionId) => {
    try {
      const response = await paymentAPI.verifySession(sessionId);
      
      if (response.data.success) {
        setPayment(response.data.data.payment);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      setError('Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBookings = () => {
    navigate('/bookings');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/services')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
        <p className="text-gray-600 mb-6">
          Your payment of <span className="font-bold">${payment?.amount}</span> was processed successfully.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-gray-600 mb-1">Booking Status</p>
          <p className="font-semibold text-green-600">Confirmed</p>
        </div>

        <button
          onClick={handleViewBookings}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          View My Bookings
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
```

#### Step 5.4: Create Cancel Page
**File:** `Frontend/src/pages/PaymentCancel.jsx`
```javascript
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const PaymentCancel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking_id');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <XCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h2>
        <p className="text-gray-600 mb-6">
          Your payment was cancelled. Your booking is still pending payment.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/services')}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Browse Services
          </button>
          <button
            onClick={() => navigate('/bookings')}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Bookings
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
```

#### Step 5.5: Update App Routes
**File:** `Frontend/src/App.jsx`
```javascript
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';

// Add routes
<Route path="/payment/success" element={<PaymentSuccess />} />
<Route path="/payment/cancel" element={<PaymentCancel />} />
```

---

## 🧪 TESTING

### Test Cards (Stripe Test Mode)
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **Requires Auth:** 4000 0025 0000 3155

### Test Flow
1. ✅ Browse services → Select service → Book
2. ✅ Redirected to Stripe payment page
3. ✅ Enter test card (4242...)
4. ✅ Complete payment
5. ✅ Redirected back to success page
6. ✅ Check booking status changed to "confirmed"

---

## 🚀 DEPLOYMENT

### 1. Get Stripe Keys
- Sign up at https://stripe.com
- Get test keys from Dashboard
- Later switch to live keys for production

### 2. Setup Webhook
- Go to Stripe Dashboard → Webhooks
- Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
- Select events:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
- Copy webhook secret to `.env`

### 3. Update Environment Variables
```env
# Production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://yourdomain.com/payment/success
STRIPE_CANCEL_URL=https://yourdomain.com/payment/cancel
```

---

## ⏱️ TIME ESTIMATE

| Phase | Time |
|-------|------|
| Backend Setup | 2-3 hours |
| Payment Controller | 2-3 hours |
| Webhook Handler | 1-2 hours |
| Routes | 30 min |
| Frontend | 2-3 hours |
| Testing | 1 hour |
| **TOTAL** | **8-12 hours** |

---

## 📝 NEXT STEPS

After quick implementation, you can upgrade to embedded payments for better UX.

Would you like me to start implementing this now?

