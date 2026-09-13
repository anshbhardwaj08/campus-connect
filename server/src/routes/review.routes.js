const express = require('express');
const reviewController = require('../controllers/review.controller');
const { verifyAccessToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createReviewSchema } = require('../validators/review.validator');

const router = express.Router();

router.get('/user/:id', reviewController.getForUser);
router.get('/listing/:id', reviewController.getForListing);
router.post('/', verifyAccessToken, validate(createReviewSchema), reviewController.create);

module.exports = router;
