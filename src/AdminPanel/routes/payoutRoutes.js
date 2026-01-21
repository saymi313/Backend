const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const { authenticate } = require('../../shared/middlewares/auth');
const { authorize } = require('../../shared/middlewares/roleAuth');
const { USER_ROLES } = require('../../shared/utils/constants/roles');

router.use(authenticate);
router.use(authorize(USER_ROLES.ADMIN));

router.get('/', payoutController.getAllPayouts);
router.post('/:id/complete', payoutController.completePayout);
router.post('/:id/reject', payoutController.rejectPayout);

module.exports = router;
