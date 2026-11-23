const express = require('express');
const validate = require('../middleware/validate');
const { createLookingForSchema } = require('../validators/community.validator');
const lookingForController = require('../controllers/lookingfor.controller');
const { verifyAccessToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', lookingForController.getAll);
// Three photos, not six: a want carries a reference photo of the KIND of
// thing ("a cycle like this"), where a listing carries a record of one
// particular object from several angles.
//
// `upload` passes a request straight through when it is not multipart, so the
// JSON callers still work — the "nobody sells the thing that goes with this"
// button on a listing page posts here with no files at all.
router.post(
  '/',
  verifyAccessToken,
  upload.array('images', 3),
  validate(createLookingForSchema),
  lookingForController.create
);
router.patch('/:id/fulfilled', verifyAccessToken, lookingForController.markFulfilled);

module.exports = router;
