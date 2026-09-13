const express = require('express');
const listingController = require('../controllers/listing.controller');
const { verifyAccessToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const { createListingSchema, updateListingSchema } = require('../validators/listing.validator');

const router = express.Router();

router.get('/', listingController.getAll);
router.get('/:id', listingController.getById);
router.get('/:id/similar', listingController.getSimilar);
router.patch('/:id/view', listingController.incrementView);

router.use(verifyAccessToken);

router.post('/', upload.array('images', 6), validate(createListingSchema), listingController.create);
router.patch('/:id', validate(updateListingSchema), listingController.update);
router.delete('/:id', listingController.delete);
router.patch('/:id/sold', listingController.markSold);
router.patch('/:id/bump', listingController.bump);
router.patch('/:id/relist', listingController.relist);

module.exports = router;
