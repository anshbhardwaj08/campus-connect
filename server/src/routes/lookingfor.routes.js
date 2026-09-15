const express = require('express');
const validate = require('../middleware/validate');
const { createLookingForSchema } = require('../validators/community.validator');
const lookingForController = require('../controllers/lookingfor.controller');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', lookingForController.getAll);
router.post('/', verifyAccessToken, validate(createLookingForSchema), lookingForController.create);
router.patch('/:id/fulfilled', verifyAccessToken, lookingForController.markFulfilled);

module.exports = router;
