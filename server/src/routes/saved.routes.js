const express = require('express');
const savedController = require('../controllers/saved.controller');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyAccessToken);

router.post('/items', savedController.save);
router.delete('/items/:listingId', savedController.unsave);
router.get('/items', savedController.getMySaved);
router.post('/searches', savedController.saveSearch);
router.get('/searches', savedController.getMySavedSearches);
router.delete('/searches/:id', savedController.deleteSavedSearch);

module.exports = router;
