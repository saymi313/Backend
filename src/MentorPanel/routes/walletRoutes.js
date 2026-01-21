const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticate } = require('../../shared/middlewares/auth');
const { authorize } = require('../../shared/middlewares/roleAuth');
const { checkMentorLoginStatus } = require('../middlewares/mentorAuth');
const { USER_ROLES } = require('../../shared/utils/constants/roles');

// All routes are protected and restricted to mentors
router.use(authenticate);
router.use(authorize(USER_ROLES.MENTOR));

// Check mentor login status (only for mentors, not admins)
router.use((req, res, next) => {
    if (req.user.role === 'mentor') {
        return checkMentorLoginStatus(req, res, next);
    }
    next();
});

router.get('/data', walletController.getWalletData);
router.post('/payout-methods', walletController.addPayoutMethod);
router.put('/payout-methods/:id', walletController.updatePayoutMethod);
router.delete('/payout-methods/:id', walletController.deletePayoutMethod);
router.post('/withdraw', walletController.requestWithdrawal);

module.exports = router;
