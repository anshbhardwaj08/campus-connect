const express = require('express');
const offerController = require('../controllers/offer.controller');
const { verifyAccessToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { sendOfferSchema, counterOfferSchema } = require('../validators/offer.validator');

const router = express.Router();

router.use(verifyAccessToken);

router.post('/', validate(sendOfferSchema), offerController.sendOffer);
router.patch('/:id/accept', offerController.acceptOffer);
router.patch('/:id/reject', offerController.rejectOffer);
router.patch('/:id/counter', validate(counterOfferSchema), offerController.counterOffer);

module.exports = router;
