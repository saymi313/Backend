const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const {
  createCheckoutSession,
  verifySession,
  getPaymentDetails,
  getPaymentHistory,
  refundPayment,
} = require('../controllers/paymentController');

router.use(authenticate);

router.post('/create-checkout-session', createCheckoutSession);
router.get('/verify-session/:sessionId', verifySession);
router.get('/details/:paymentId', getPaymentDetails);
router.get('/history', getPaymentHistory);
router.post('/refund/:paymentId', refundPayment);

module.exports = router;

