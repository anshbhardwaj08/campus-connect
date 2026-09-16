const express = require('express');
const dealController = require('../controllers/deal.controller');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyAccessToken);

router.post('/', dealController.createDeal);
router.post('/from-conversation', dealController.createFromConversation);
router.post('/:id/generate-code', dealController.generateCode);
router.post('/:id/verify-code', dealController.verifyCode);
router.patch('/:id/buyer-confirm', dealController.buyerConfirm);
router.patch('/:id/seller-confirm', dealController.sellerConfirm);
router.patch('/:id/returned', dealController.markReturned);
router.patch('/:id/dispute', dealController.openDispute);

module.exports = router;
