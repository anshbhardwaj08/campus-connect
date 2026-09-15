const express = require('express');
const userController = require('../controllers/user.controller');
const { verifyAccessToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// ORDER MATTERS. Every "/me" route has to be declared before the "/:id"
// routes below, or Express matches "/users/me/listings" against
// "/:id/listings" with id === "me" and the handler blows up casting it to
// an ObjectId. Auth is applied per-route rather than with router.use() so
// the public routes can sit underneath without being swept into it.
router.get('/me', verifyAccessToken, userController.getProfile);
router.patch('/me', verifyAccessToken, userController.updateProfile);
router.get('/me/listings', verifyAccessToken, userController.getMyListings);
router.get('/me/deals', verifyAccessToken, userController.getMyDeals);

// Public: a listing is viewable signed-out and links to the seller's
// profile, so the profile surface has to be reachable the same way. The
// handlers return narrow projections — never the whole user document.
router.get('/:id', userController.getPublicProfile);
router.get('/:id/reviews', userController.getUserReviews);
router.get('/:id/listings', userController.getUserListings);

// Blocking a user is moderation, not something one student does to another.
// This previously required only a valid login, which let any student block
// any other student.
router.post('/:id/block', verifyAccessToken, requireRole('admin', 'moderator'), userController.blockUser);

module.exports = router;
