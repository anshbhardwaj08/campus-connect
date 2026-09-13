const express = require('express');
const userController = require('../controllers/user.controller');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyAccessToken);

router.get('/me', userController.getProfile);
router.patch('/me', userController.updateProfile);
router.get('/me/listings', userController.getMyListings);
router.get('/me/deals', userController.getMyDeals);
router.get('/:id/reviews', userController.getUserReviews);
router.post('/:id/block', userController.blockUser);

module.exports = router;
